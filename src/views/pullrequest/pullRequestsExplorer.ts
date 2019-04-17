import { commands, ConfigurationChangeEvent } from 'vscode';
import { BitbucketContext } from '../../bitbucket/bbContext';
import { Container } from '../../container';
import { configuration } from '../../config/configuration';
import { Commands } from '../../commands';
import { PullRequestTreeViewId, setCommandContext, CommandContext } from '../../constants';
import { PullRequestNodeDataProvider } from '../pullRequestNodeDataProvider';
import { PullRequestCreatedMonitor } from './pullRequestCreatedMonitor';
import { BitbucketExplorer, Tree } from '../BitbucketExplorer';

export class PullRequestsExplorer extends BitbucketExplorer {

    constructor(ctx: BitbucketContext) {
        super(ctx);

        Container.context.subscriptions.push(
            commands.registerCommand(Commands.BitbucketRefreshPullRequests, () => this.refresh()),
            commands.registerCommand(Commands.BitbucketShowPullRequestDetails, async (pr) => {
                await Container.pullRequestViewManager.createOrShow(pr);
            }),
            commands.registerCommand(Commands.CreatePullRequest, Container.pullRequestCreatorView.createOrShow, Container.pullRequestCreatorView)
        );
    }

    viewId(): string {
        return PullRequestTreeViewId;
    }

    explorerEnabledConfiguration(): string {
        return 'bitbucket.explorer.enabled';
    }

    monitorEnabledConfiguration(): string {
        return 'bitbucket.explorer.notifications.pullRequestCreated';
    }

    refreshConfiguation(): string {
        return 'bitbucket.explorer.refreshInterval';
    }

    newTreeDataProvider(): Tree {
        return new PullRequestNodeDataProvider(this.ctx);
    }

    newMonitor(): BitbucketActivityMonitor {
        return new PullRequestCreatedMonitor(this.ctx);
    }

    onConfigurationChanged(e: ConfigurationChangeEvent) {
        const initializing = configuration.initializing(e);

        if (initializing || configuration.changed(e, 'bitbucket.explorer.enabled')) {
            setCommandContext(CommandContext.BitbucketExplorer, Container.config.bitbucket.explorer.enabled);
        }
    }
}
