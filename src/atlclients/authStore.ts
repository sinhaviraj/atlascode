import { AuthInfo, Product, OAuthProvider, ProductJira, ProductBitbucket, getSecretForAuthInfo, emptyAuthInfo, AuthInfoEvent, AuthChangeType, DetailedSiteInfo, UpdateAuthInfoEvent, RemoveAuthInfoEvent, oauthProviderForSite, isOAuthInfo } from './authInfo';
import { keychain } from '../util/keychain';
import { window, Disposable, EventEmitter, Event, version } from 'vscode';
import { Logger } from '../logger';
import { setCommandContext, CommandContext } from '../constants';
import { loggedOutEvent } from '../analytics';
import { OAuthRefesher } from './oauthRefresher';
import { AnalyticsClient } from '../analytics-node-client/src';
import PQueue from 'p-queue';

const keychainServiceNameV3 = version.endsWith('-insider') ? "atlascode-insiders-authinfoV3" : "atlascode-authinfoV3";

export class CredentialManager implements Disposable {
    private _memStore: Map<string, Map<string, AuthInfo>> = new Map<string, Map<string, AuthInfo>>();
    private _queue = new PQueue({ concurrency: 1 });
    private _refresher = new OAuthRefesher();

    constructor(private _analyticsClient: AnalyticsClient) {
        this._memStore.set(ProductJira.key, new Map<string, AuthInfo>());
        this._memStore.set(ProductBitbucket.key, new Map<string, AuthInfo>());
    }

    private _onDidAuthChange = new EventEmitter<AuthInfoEvent>();
    public get onDidAuthChange(): Event<AuthInfoEvent> {
        return this._onDidAuthChange.event;
    }

    dispose() {
        this._memStore.clear();
        this._onDidAuthChange.dispose();
    }

    /* */
    public async getAuthInfo(site: DetailedSiteInfo): Promise<AuthInfo | undefined> {
        return this.getAuthInfoForProductAndCredentialId(site.product.key, site.credentialId);
    }

    /* */
    public async saveAuthInfo(site: DetailedSiteInfo, info: AuthInfo): Promise<void> {
        let productAuths = this._memStore.get(site.product.key);

        if (!productAuths) {
            productAuths = new Map<string, AuthInfo>();
        }

        const oldInfo = await this.getAuthInfo(site);
        this._memStore.set(site.product.key, productAuths.set(site.credentialId, info));

        const hasNewInfo = !oldInfo ||
            getSecretForAuthInfo(oldInfo) !== getSecretForAuthInfo(info) ||
            oldInfo.user.id !== info.user.id;

        if (hasNewInfo) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx !== undefined) {
                setCommandContext(cmdctx, info !== emptyAuthInfo ? true : false);
            }

            try {
                this.addSiteInformationToKeychain(site.product.key, site.credentialId, info);

                const updateEvent: UpdateAuthInfoEvent = { type: AuthChangeType.Update, site: site };
                this._onDidAuthChange.fire(updateEvent);
            } catch (e) {
                Logger.debug("error saving auth info to keychain: ", e);
            }

        }
    }

    private async getAuthInfoForProductAndCredentialId(productKey: string, credentialId: string): Promise<AuthInfo | undefined> {
        let foundInfo: AuthInfo | undefined = undefined;
        let productAuths = this._memStore.get(productKey);

        if (productAuths && productAuths.has(credentialId)) {
            foundInfo = productAuths.get(credentialId);
        }

        if (!foundInfo && keychain) {
            try {
                let infoEntry = await this.getJsonAuthInfoFromKeychain(productKey, credentialId) || undefined;
                if (infoEntry) {
                    let info: AuthInfo = JSON.parse(infoEntry);

                    if (info && productAuths) {
                        this._memStore.set(productKey, productAuths.set(credentialId, info));

                        foundInfo = info;
                    }

                }
            } catch (e) {
                Logger.info(`keychain error ${e}`);
            }
        }

        return foundInfo;
        //return foundInfo ? foundInfo : Promise.reject(`no authentication info found for site ${site.hostname}`);
    }

    private async addSiteInformationToKeychain(productKey: string, credentialId: string, info: AuthInfo) {
        await this._queue.add(async () => {
            if (keychain) {
                await keychain.setPassword(keychainServiceNameV3, `${productKey}-${credentialId}`, JSON.stringify(info));
            }
        }, { priority: 1 });
    }

    private async removeSiteInformationFromKeychain(productKey: string, credentialId: string): Promise<boolean> {
        let wasKeyDeleted = false;
        await this._queue.add(async () => {
            if (keychain) {
                wasKeyDeleted = await keychain.deletePassword(keychainServiceNameV3, `${productKey}-${credentialId}`);
            }
        }, { priority: 1 });
        return wasKeyDeleted;
    }

    private async getJsonAuthInfoFromKeychain(productKey: string, credentialId: string, serviceName?: string): Promise<string | null> {
        let svcName = keychainServiceNameV3;

        if (serviceName) {
            svcName = serviceName;
        }

        let authInfo: string | null = null;
        await this._queue.add(async () => {
            if (keychain) {
                authInfo = await keychain.getPassword(svcName, `${productKey}-${credentialId}`);
            }
        }, { priority: 0 });
        return authInfo;
    }

    /* */
    public async refreshAccessToken(site: DetailedSiteInfo): Promise<string | undefined> {
        const credentials = await this.getAuthInfo(site);
        if (!isOAuthInfo(credentials)) {
            return undefined;
        }

        const provider: OAuthProvider | undefined = oauthProviderForSite(site);
        let newAccessToken = undefined;
        if (provider && credentials) {
            newAccessToken = await this._refresher.getNewAccessToken(provider, credentials.refresh);
            if (newAccessToken) {
                credentials.access = newAccessToken;
                this.saveAuthInfo(site, credentials);
            }
        }
        return newAccessToken;
    }

    /* */
    public async removeAuthInfo(site: DetailedSiteInfo): Promise<boolean> {
        let productAuths = this._memStore.get(site.product.key);
        let wasKeyDeleted = false;
        let wasMemDeleted = false;
        if (productAuths) {
            wasMemDeleted = productAuths.delete(site.credentialId);
            this._memStore.set(site.product.key, productAuths);
        }

        wasKeyDeleted = await this.removeSiteInformationFromKeychain(site.product.key, site.credentialId);

        if (wasMemDeleted || wasKeyDeleted) {
            const cmdctx = this.commandContextFor(site.product);
            if (cmdctx) {
                setCommandContext(cmdctx, false);
            }

            let name = site.name;

            const removeEvent: RemoveAuthInfoEvent = { type: AuthChangeType.Remove, product: site.product, credentialId: site.credentialId };
            this._onDidAuthChange.fire(removeEvent);

            window.showInformationMessage(`You have been logged out of ${site.product.name}: ${name}`);

            loggedOutEvent(site).then(e => { this._analyticsClient.sendTrackEvent(e); });
            return true;
        }

        return false;
    }

    private commandContextFor(product: Product): string | undefined {
        switch (product.key) {
            case ProductJira.key:
                return CommandContext.IsJiraAuthenticated;
            case ProductBitbucket.key:
                return CommandContext.IsBBAuthenticated;
        }
        return undefined;
    }
}
