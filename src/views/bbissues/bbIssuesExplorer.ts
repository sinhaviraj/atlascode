import { ConfigurationChangeEvent, commands } from "vscode";
import { Container } from "../../container";
import { configuration } from "../../config/configuration";
import { setCommandContext, CommandContext, BitbucketIssuesTreeViewId } from "../../constants";
import { BitbucketContext } from "../../bitbucket/bbContext";
import { Commands } from "../../commands";
import { BitbucketIssuesDataProvider } from "../bitbucketIssuesDataProvider";
import { BitbucketIssuesMonitor } from "./bbIssuesMonitor";
import { BitbucketExplorer, Tree } from "../BitbucketExplorer";

export class BitbucketIssuesExplorer extends BitbucketExplorer {
    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.BitbucketIssuesRefresh, this.refresh, this),
            commands.registerCommand(Commands.CreateBitbucketIssue, Container.createBitbucketIssueWebview.createOrShow, Container.createBitbucketIssueWebview)
        );
    }

    viewId(): string {
        return BitbucketIssuesTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.issues.explorerEnabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.issues.monitorEnabled';
    }

    refreshConfiguation(): string {
        return 'bitbucket.issues.refreshInterval';
    }

    newTreeDataProvider(): Tree {
        return new BitbucketIssuesDataProvider(this.ctx);
    }

    newMonitor(): BitbucketActivityMonitor {
        const repos = this.ctx.getBitbucketRepositores();
        return new BitbucketIssuesMonitor(repos);
    }

    async onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.issues.explorerEnabled')) {
            setCommandContext(CommandContext.BitbucketIssuesExplorer, Container.config.bitbucket.issues.explorerEnabled);
        }
    }
}
