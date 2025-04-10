import { InlineTextEditor, RefreshButton } from '@atlassianlabs/guipi-core-components';
import {
    AppBar,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Grid,
    Link,
    makeStyles,
    Paper,
    Theme,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from '@material-ui/core';
import AwesomeDebouncePromise from 'awesome-debounce-promise';
import React, { useCallback, useEffect, useState } from 'react';
import { ApprovalStatus, User } from '../../../bitbucket/model';
import { BasicPanel } from '../common/BasicPanel';
import CommentForm from '../common/CommentForm';
import { CopyLinkButton } from '../common/CopyLinkButton';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ApproveButton } from './ApproveButton';
import { formatDate } from './bitbucketDateFormatter';
import { BranchInfo } from './BranchInfo';
import { Commits } from './Commits';
import { DiffList } from './DiffList';
import { MergeDialog } from './MergeDialog';
import { RequestChangesButton } from './RequestChangesButton';
import { NestedCommentList } from './NestedCommentList';
import { PageTaskList } from './PageTaskList';
import { PRBuildStatus } from './PRBuildStatus';
import {
    PullRequestDetailsControllerApi,
    PullRequestDetailsControllerContext,
    PullRequestDetailsState,
    usePullRequestDetailsController,
} from './pullRequestDetailsController';
import { RelatedBitbucketIssues } from './RelatedBitbucketIssues';
import { RelatedJiraIssues } from './RelatedJiraIssues';
import { Reviewers } from './Reviewers';
import { SummaryPanel } from './SummaryPanel';
import { AtlascodeErrorBoundary } from '../common/ErrorBoundary';
import { AnalyticsView } from 'src/analyticsTypes';

const useStyles = makeStyles((theme: Theme) => ({
    grow: {
        flexGrow: 1,
    },
    title: {
        flexGrow: 0,
        marginRight: theme.spacing(3),
        marginLeft: theme.spacing(1),
    },
    paper100: {
        overflow: 'hidden',
        height: '100%',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    paperOverflow: {
        overflow: 'hidden',
        backgroundColor: 'transparent',
        boxShadow: 'none',
        border: 'none',
    },
    verticalDivider: {
        height: '100%',
        marginLeft: theme.spacing(1),
        marginRight: theme.spacing(1),
        display: 'none',
        [theme.breakpoints.up('md')]: {
            display: 'block',
        },
    },
}));

interface PullRequestHeaderProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    currentUserApprovalStatus: ApprovalStatus;
    isSomethingLoading: () => boolean;
}

const PullRequestHeader: React.FC<PullRequestHeaderProps> = ({
    state,
    controller,
    currentUserApprovalStatus,
    isSomethingLoading,
}) => {
    return (
        <AppBar position="relative">
            <Toolbar>
                <Box flexGrow={1}>
                    <Typography variant={'h3'}>
                        <Link color="textPrimary" href={state.pr.data.url}>
                            {`${state.pr.data.destination!.repo.displayName}: Pull request #${state.pr.data.id}`}
                        </Link>
                    </Typography>
                </Box>
                <CopyLinkButton
                    tooltip="Copy link to pull request"
                    url={state.pr.data.url}
                    onClick={controller.copyLink}
                />
                <Box marginLeft={1} hidden={state.loadState.basicData}>
                    <RequestChangesButton
                        hidden={
                            !state.pr.site.details.isCloud &&
                            state.currentUser.accountId === state.pr.data.author.accountId
                        }
                        status={currentUserApprovalStatus}
                        onApprove={controller.updateApprovalStatus}
                    />
                </Box>
                <Box marginLeft={1} hidden={state.loadState.basicData}>
                    <ApproveButton
                        hidden={
                            !state.pr.site.details.isCloud &&
                            state.currentUser.accountId === state.pr.data.author.accountId
                        }
                        status={currentUserApprovalStatus}
                        onApprove={controller.updateApprovalStatus}
                    />
                </Box>
                <Box marginLeft={1} hidden={state.loadState.basicData}>
                    <MergeDialog
                        prData={state.pr.data}
                        commits={state.commits}
                        relatedJiraIssues={state.relatedJiraIssues}
                        relatedBitbucketIssues={state.relatedBitbucketIssues}
                        mergeStrategies={state.mergeStrategies}
                        loadState={{
                            basicData: state.loadState.basicData,
                            commits: state.loadState.commits,
                            mergeStrategies: state.loadState.mergeStrategies,
                            relatedJiraIssues: state.loadState.relatedJiraIssues,
                            relatedBitbucketIssues: state.loadState.relatedBitbucketIssues,
                        }}
                        merge={controller.merge}
                    />
                </Box>
                <RefreshButton loading={isSomethingLoading()} onClick={controller.refresh} />
            </Toolbar>
        </AppBar>
    );
};

interface PullRequestTitleSectionProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
}

const PullRequestTitleSection: React.FC<PullRequestTitleSectionProps> = ({ state, controller }) => {
    return (
        <Box margin={2}>
            <Grid container direction={'column'} spacing={1}>
                <Grid item>
                    <InlineTextEditor fullWidth defaultValue={state.pr.data.title} onSave={controller.updateTitle} />
                </Grid>
                <Grid item>
                    <Grid container direction="row" spacing={2} justify={'space-between'}>
                        <Grid item>
                            <Box marginLeft={2}>
                                <BranchInfo
                                    source={state.pr.data.source}
                                    destination={state.pr.data.destination}
                                    author={state.pr.data.author}
                                    isLoading={state.loadState.basicData}
                                />
                            </Box>
                        </Grid>

                        <Grid item>
                            <Button
                                disabled={
                                    state.pr.data.source.branchName === state.currentBranchName ||
                                    state.isCheckingOutBranch
                                }
                                onClick={controller.checkoutBranch}
                                color={'primary'}
                            >
                                <Typography variant="button" noWrap>
                                    {state.pr.data.source.branchName === state.currentBranchName
                                        ? 'Source branch checked out'
                                        : state.isCheckingOutBranch
                                          ? 'Checking out...'
                                          : 'Checkout source branch'}
                                </Typography>
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

interface PullRequestMainContentProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    handleFetchUsers: (input: string, abortSignal?: AbortSignal) => Promise<User[]>;
    taskTitle: () => string;
}

const PullRequestMainContent: React.FC<PullRequestMainContentProps> = ({
    state,
    controller,
    handleFetchUsers,
    taskTitle,
}) => {
    return (
        <Box margin={2}>
            <Grid container spacing={3} direction="column" justify="center">
                <ErrorDisplay />

                <Grid item>
                    <SummaryPanel
                        rawSummary={state.pr.data.rawSummary}
                        htmlSummary={state.pr.data.htmlSummary}
                        fetchUsers={handleFetchUsers}
                        isLoading={state.loadState.basicData}
                        summaryChange={controller.updateSummary}
                    />
                </Grid>
                {state.relatedJiraIssues.length > 0 && (
                    <Grid item>
                        <BasicPanel
                            title={'Related Jira Issues'}
                            subtitle={`${state.relatedJiraIssues.length} issues`}
                            isLoading={state.loadState.relatedJiraIssues}
                            hidden={state.relatedJiraIssues.length === 0}
                        >
                            <RelatedJiraIssues
                                relatedIssues={state.relatedJiraIssues}
                                openJiraIssue={controller.openJiraIssue}
                            />
                        </BasicPanel>
                    </Grid>
                )}
                {state.relatedBitbucketIssues.length > 0 && (
                    <Grid item>
                        <BasicPanel
                            title={'Related Bitbucket Issues'}
                            subtitle={`${state.relatedBitbucketIssues.length} issues`}
                            isLoading={state.loadState.relatedBitbucketIssues}
                            hidden={state.relatedBitbucketIssues.length === 0}
                        >
                            <RelatedBitbucketIssues
                                relatedIssues={state.relatedBitbucketIssues}
                                openBitbucketIssue={controller.openBitbucketIssue}
                            />
                        </BasicPanel>
                    </Grid>
                )}
                <Grid item>
                    <BasicPanel
                        title={'Commits'}
                        subtitle={`${state.commits.length} commits`}
                        isDefaultExpanded
                        isLoading={state.loadState.commits}
                    >
                        <Commits commits={state.commits} />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel
                        title={'Files Changed'}
                        subtitle={'Click on file names to open diff in editor'}
                        isDefaultExpanded
                        isLoading={state.loadState.diffs}
                    >
                        <DiffList
                            fileDiffs={state.fileDiffs}
                            openDiffHandler={controller.openDiff}
                            conflictedFiles={state.conflictedFiles}
                        />
                    </BasicPanel>
                </Grid>
                <Grid item>
                    <BasicPanel title={'Comments'} isDefaultExpanded isLoading={state.loadState.comments}>
                        <Grid container spacing={2} direction="column">
                            <Grid item>
                                <NestedCommentList
                                    comments={state.comments}
                                    currentUser={state.currentUser}
                                    fetchUsers={handleFetchUsers}
                                    onDelete={controller.deleteComment}
                                />
                            </Grid>
                            <Grid item>
                                <CommentForm
                                    currentUser={state.currentUser}
                                    fetchUsers={handleFetchUsers}
                                    onSave={controller.postComment}
                                />
                            </Grid>
                        </Grid>
                    </BasicPanel>
                </Grid>
            </Grid>
        </Box>
    );
};

interface PullRequestSidebarProps {
    state: PullRequestDetailsState;
    controller: PullRequestDetailsControllerApi;
    taskTitle: () => string;
}

const PullRequestSidebar: React.FC<PullRequestSidebarProps> = ({ state, controller, taskTitle }) => {
    return (
        <Box margin={2}>
            <Grid container spacing={1} direction={'column'}>
                <Grid item>
                    <Typography variant="h6">
                        <strong>Author</strong>
                    </Typography>
                    <Box hidden={state.loadState.basicData}>
                        <Grid container spacing={1} direction="row" alignItems="center">
                            <Grid item>
                                {' '}
                                <Tooltip title={state.pr.data.author.displayName}>
                                    <Avatar
                                        alt={state.pr.data.author.displayName}
                                        src={state.pr.data.author.avatarUrl}
                                    />
                                </Tooltip>
                            </Grid>

                            <Grid item>
                                <Typography>{state.pr.data.author.displayName}</Typography>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box hidden={!state.loadState.basicData}>
                        <CircularProgress />
                    </Box>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Reviewers</strong>
                    </Typography>
                    <Box marginLeft={2} marginTop={1}>
                        <Reviewers
                            site={state.pr.site}
                            participants={state.pr.data.participants}
                            onUpdateReviewers={controller.updateReviewers}
                            isLoading={state.loadState.basicData}
                        />
                    </Box>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Created</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.ts || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.ts)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Updated</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.updatedTs || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.updatedTs)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Created</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.ts || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.ts)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <Typography variant="h6">
                        <strong>Updated</strong>
                    </Typography>
                    <Tooltip title={state.pr.data.updatedTs || 'unknown'}>
                        <Typography>{formatDate(state.pr.data.updatedTs)}</Typography>
                    </Tooltip>
                </Grid>

                <Grid item>
                    <BasicPanel
                        isLoading={state.loadState.buildStatuses}
                        isDefaultExpanded
                        hidden={state.buildStatuses.length === 0}
                        title={`${
                            state.buildStatuses.filter((status) => status.state === 'SUCCESSFUL').length
                        } of ${state.buildStatuses.length} build${state.buildStatuses.length > 0 ? 's' : ''} passed`}
                    >
                        <PRBuildStatus
                            buildStatuses={state.buildStatuses}
                            openBuildStatus={controller.openBuildStatus}
                        />
                    </BasicPanel>
                </Grid>

                <Grid item>
                    <BasicPanel
                        title={'Tasks'}
                        subtitle={taskTitle()}
                        isDefaultExpanded
                        isLoading={state.loadState.tasks}
                    >
                        <PageTaskList
                            tasks={state.tasks}
                            onEdit={controller.editTask}
                            onDelete={controller.deleteTask}
                        />
                    </BasicPanel>
                </Grid>
            </Grid>
        </Box>
    );
};

export const PullRequestDetailsPage: React.FunctionComponent = () => {
    const classes = useStyles();
    const theme = useTheme();
    const [state, controller] = usePullRequestDetailsController();
    const [currentUserApprovalStatus, setCurrentUserApprovalStatus] = useState<ApprovalStatus>('UNAPPROVED');

    const handleFetchUsers = AwesomeDebouncePromise(
        async (input: string, abortSignal?: AbortSignal): Promise<User[]> => {
            return await controller.fetchUsers(state.pr.site, input, abortSignal);
        },
        300,
        { leading: false },
    );

    const isSomethingLoading = useCallback(() => {
        return Object.entries(state.loadState).some(
            (entry) => entry[1] /* Second index is the value in the key/value pair */,
        );
    }, [state.loadState]);

    const taskTitle = useCallback(() => {
        const numTasks = state.tasks.length;
        const numCompletedTasks = state.tasks.filter((task) => task.isComplete).length;
        return numTasks === 0 ? '0 tasks' : `${numCompletedTasks} of ${numTasks} complete`;
    }, [state.tasks]);

    useEffect(() => {
        const foundCurrentUser = state.pr.data.participants.find(
            (participant) => participant.accountId === state.currentUser.accountId,
        );
        if (foundCurrentUser) {
            setCurrentUserApprovalStatus(foundCurrentUser.status);
        }
    }, [state.pr.data.participants, state.currentUser.accountId]);

    const isWideScreen = useMediaQuery(theme.breakpoints.up('md'));

    return (
        <PullRequestDetailsControllerContext.Provider value={controller}>
            <AtlascodeErrorBoundary
                context={{ view: AnalyticsView.PullRequestPage }}
                postMessageFunc={controller.postMessage}
            >
                <Container maxWidth="xl">
                    <PullRequestHeader
                        state={state}
                        controller={controller}
                        currentUserApprovalStatus={currentUserApprovalStatus}
                        isSomethingLoading={isSomethingLoading}
                    />
                    <Divider />
                    <Box marginTop={1} />
                    <Grid container spacing={1} direction="row">
                        <Grid item xs={12} md={9} lg={9} xl={9}>
                            <Paper className={classes.paper100}>
                                <PullRequestTitleSection state={state} controller={controller} />
                                <PullRequestMainContent
                                    state={state}
                                    controller={controller}
                                    handleFetchUsers={handleFetchUsers}
                                    taskTitle={taskTitle}
                                />
                            </Paper>
                        </Grid>
                        <Grid
                            item
                            xs={12}
                            md={3}
                            lg={3}
                            xl={3}
                            style={{ borderLeft: isWideScreen ? '1px solid var(--vscode-input-border)' : 'none' }}
                        >
                            <Paper className={classes.paperOverflow}>
                                <PullRequestSidebar state={state} controller={controller} taskTitle={taskTitle} />
                            </Paper>
                        </Grid>
                    </Grid>
                </Container>
            </AtlascodeErrorBoundary>
        </PullRequestDetailsControllerContext.Provider>
    );
};

export default PullRequestDetailsPage;
