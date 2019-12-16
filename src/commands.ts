import { isMinimalIssue, MinimalIssue, MinimalIssueOrKeyAndSite } from 'jira-pi-client';
import * as vscode from 'vscode';
import { Registry, viewScreenEvent } from './analytics';
import { DetailedSiteInfo, ProductBitbucket } from './atlclients/authInfo';
import { showBitbucketDebugInfo } from './bitbucket/bbDebug';
import { BitbucketIssue } from './bitbucket/model';
import { assignIssue } from './commands/jira/assignIssue';
import { createIssue } from './commands/jira/createIssue';
import { showIssue, showIssueForKey, showIssueForSiteIdAndKey } from './commands/jira/showIssue';
import { startWorkOnIssue } from './commands/jira/startWorkOnIssue';
import { SettingSource } from './config/model';
import { Container } from './container';
import { AbstractBaseNode } from './views/nodes/abstractBaseNode';
import { IssueNode } from './views/nodes/issueNode';

export enum Commands {
    BitbucketSelectContainer = 'atlascode.bb.selectContainer',
    BitbucketFetchPullRequests = 'atlascode.bb.fetchPullRequests',
    BitbucketRefreshPullRequests = 'atlascode.bb.refreshPullRequests',
    BitbucketShowOpenPullRequests = 'atlascode.bb.showOpenPullRequests',
    BitbucketShowPullRequestsToReview = 'atlascode.bb.showPullRequestsToReview',
    BitbucketShowPullRequestsCreatedByMe = 'atlascode.bb.showOpenPullRequestsCreatedByMe',
    BitbucketPullRequestFilters = 'atlascode.bb.showPullRequestFilters',
    BitbucketShowPullRequestDetails = 'atlascode.bb.showPullRequestDetails',
    BitbucketPullRequestsNextPage = 'atlascode.bb.pullReqeustsNextPage',
    RefreshPullRequestExplorerNode = 'atlascode.bb.refreshPullRequest',
    ViewInWebBrowser = 'atlascode.viewInWebBrowser',
    BitbucketAddComment = 'atlascode.bb.addComment',
    BitbucketDeleteComment = 'atlascode.bb.deleteComment',
    BitbucketEditComment = 'atlascode.bb.editComment',
    BitbucketDeleteTask = 'atlascode.bb.deleteTask',
    BitbucketAddTask = 'atlascode.bb.addTask',
    BitbucketEditTask = 'atlascode.bb.editTask',
    BitbucketMarkTaskComplete = 'atlascode.bb.markTaskComplete',
    BitbucketMarkTaskIncomplete = 'atlascode.bb.markTaskIncomplete',
    BitbucketToggleCommentsVisibility = 'atlascode.bb.toggleCommentsVisibility',
    CreateIssue = 'atlascode.jira.createIssue',
    RefreshJiraExplorer = 'atlascode.jira.refreshExplorer',
    ShowJiraIssueSettings = "atlascode.jira.showJiraIssueSettings",
    ShowPullRequestSettings = "atlascode.bb.showPullRequestSettings",
    ShowPipelineSettings = "atlascode.bb.showPipelineSettings",
    ShowBitbucketIssueSettings = "atlascode.bb.showBitbucketIssueSettings",
    ShowIssue = 'atlascode.jira.showIssue',
    ShowIssueForKey = 'atlascode.jira.showIssueForKey',
    ShowIssueForSiteIdAndKey = 'atlascode.jira.showIssueForSiteIdAndKey',
    ShowConfigPage = 'atlascode.showConfigPage',
    ShowJiraAuth = 'atlascode.showJiraAuth',
    ShowBitbucketAuth = 'atlascode.showBitbucketAuth',
    ShowWelcomePage = 'atlascode.showWelcomePage',
    ShowOnboardingPage = 'atlascode.showOnboardingPage',
    AssignIssueToMe = 'atlascode.jira.assignIssueToMe',
    StartWorkOnIssue = 'atlascode.jira.startWorkOnIssue',
    CreatePullRequest = 'atlascode.bb.createPullRequest',
    StartPipeline = 'atlascode.bb.startPipeline',
    RefreshPipelines = 'atlascode.bb.refreshPipelines',
    ShowPipeline = 'atlascode.bb.showPipeline',
    PipelinesNextPage = 'atlascode.bb.pipelinesNextPage',
    BitbucketIssuesNextPage = 'atlascode.bb.issuesNextPage',
    BitbucketIssuesRefresh = 'atlascode.bb.refreshIssues',
    CreateBitbucketIssue = 'atlascode.bb.createIssue',
    ShowBitbucketIssue = 'atlascode.bb.showIssue',
    StartWorkOnBitbucketIssue = 'atlascode.bb.startWorkOnIssue',
    BBPRCancelAction = 'atlascode.bb.cancelCommentAction',
    BBPRSaveAction = 'atlascode.bb.saveCommentAction',
    ViewDiff = 'atlascode.viewDiff',
    DebugBitbucketSites = 'atlascode.debug.bitbucketSites'
}

export function registerCommands(vscodeContext: vscode.ExtensionContext) {
    vscodeContext.subscriptions.push(
        vscode.commands.registerCommand(Commands.ShowConfigPage, () => Container.configWebview.createOrShowConfig(SettingSource.Default)),
        vscode.commands.registerCommand(Commands.ShowJiraAuth, () => Container.configWebview.createOrShowConfig(SettingSource.JiraAuth)),
        vscode.commands.registerCommand(Commands.ShowBitbucketAuth, () => Container.configWebview.createOrShowConfig(SettingSource.BBAuth)),
        vscode.commands.registerCommand(Commands.ShowJiraIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.JiraIssue)),
        vscode.commands.registerCommand(Commands.ShowPullRequestSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPullRequest)),
        vscode.commands.registerCommand(Commands.ShowPipelineSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBPipeline)),
        vscode.commands.registerCommand(Commands.ShowBitbucketIssueSettings, () => Container.configWebview.createOrShowConfig(SettingSource.BBIssue)),
        vscode.commands.registerCommand(Commands.ShowWelcomePage, () => Container.welcomeWebview.createOrShow()),
        vscode.commands.registerCommand(Commands.ShowOnboardingPage, () => Container.onboardingWebview.createOrShow()),
        vscode.commands.registerCommand(Commands.ViewInWebBrowser, async (prNode: AbstractBaseNode) => {
            const uri = (await prNode.getTreeItem()).resourceUri;
            if (uri) {
                vscode.env.openExternal(uri);
            }
        }),
        vscode.commands.registerCommand(Commands.CreateIssue, (data: any) => createIssue(data)),
        vscode.commands.registerCommand(Commands.ShowIssue, async (issueOrKeyAndSite: MinimalIssueOrKeyAndSite<DetailedSiteInfo>) => await showIssue(issueOrKeyAndSite)),
        vscode.commands.registerCommand(Commands.ShowIssueForKey, async (issueKey?: string) => await showIssueForKey(issueKey)),
        vscode.commands.registerCommand(Commands.ShowIssueForSiteIdAndKey, async (siteId: string, issueKey: string) => await showIssueForSiteIdAndKey(siteId, issueKey)),
        vscode.commands.registerCommand(Commands.AssignIssueToMe, (issueNode: IssueNode) => assignIssue(issueNode)),
        vscode.commands.registerCommand(Commands.StartWorkOnIssue, (issueNodeOrMinimalIssue: IssueNode | MinimalIssue<DetailedSiteInfo>) => startWorkOnIssue(isMinimalIssue(issueNodeOrMinimalIssue) ? issueNodeOrMinimalIssue : issueNodeOrMinimalIssue.issue)),
        vscode.commands.registerCommand(Commands.StartWorkOnBitbucketIssue, (issue: BitbucketIssue) => Container.startWorkOnBitbucketIssueWebview.createOrShowIssue(issue)),
        vscode.commands.registerCommand(Commands.ViewDiff, async (...diffArgs: [() => {}, vscode.Uri, vscode.Uri, string]) => {
            viewScreenEvent(Registry.screen.pullRequestDiffScreen, undefined, ProductBitbucket).then(e => { Container.analyticsClient.sendScreenEvent(e); });
            diffArgs[0]();
            vscode.commands.executeCommand('vscode.diff', ...diffArgs.slice(1));
        }),
        vscode.commands.registerCommand(Commands.ShowPipeline, (pipelineInfo: any) => {
            Container.pipelineViewManager.createOrShow(pipelineInfo);
        }),
        vscode.commands.registerCommand(Commands.ShowBitbucketIssue, (issue: BitbucketIssue) => Container.bitbucketIssueViewManager.createOrShow(issue)),
        vscode.commands.registerCommand(Commands.DebugBitbucketSites, showBitbucketDebugInfo),
    );
}
