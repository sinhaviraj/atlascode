import { ReducerAction } from '@atlassianlabs/guipi-core-controller';
import { CommonAction } from './common';

export enum BitbucketIssueActionType {
    UpdateStatusRequest = 'updateStatusRequest',
    AddCommentRequest = 'addCommentRequest',
    FetchUsersRequest = 'fetchUsersRequest',
    AssignRequest = 'assignRequest',
}

export type BitbucketIssueAction =
    | ReducerAction<BitbucketIssueActionType.UpdateStatusRequest, UpdateStatusRequestAction>
    | ReducerAction<BitbucketIssueActionType.AddCommentRequest, AddCommentRequestAction>
    | ReducerAction<BitbucketIssueActionType.FetchUsersRequest, FetchUsersRequestAction>
    | ReducerAction<BitbucketIssueActionType.AssignRequest, AssignRequestAction>
    | CommonAction;

export interface UpdateStatusRequestAction {
    status: string;
}

export interface AddCommentRequestAction {
    content: string;
}

export interface FetchUsersRequestAction {
    query: string;
    abortSignal?: AbortSignal;
}

export interface AssignRequestAction {
    accountId?: string;
}
