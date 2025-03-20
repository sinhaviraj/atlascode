import { MinimalIssue } from '@atlassianlabs/jira-pi-common-models';
import { DetailedSiteInfo, ProductBitbucket, ProductJira } from '../../../atlclients/authInfo';
import { Container } from '../../../container';
import { CustomJQLViewProvider } from './customJqlViewProvider';
import { SitesAvailableUpdateEvent } from '../../../siteManager';
import * as utils from './utils';

const mockJqlEntries = [
    {
        id: '1',
        name: 'Test JQL Entry',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
    {
        id: '2',
        name: 'Test JQL Entry 2',
        query: 'project = TEST',
        siteId: '1',
        enabled: true,
        monitor: true,
    },
];

const mockedIssue1 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-1',
    isEpic: false,
    summary: 'summary1',
    status: { name: 'statusName', statusCategory: { name: 'To Do' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

const mockedIssue2 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-2',
    isEpic: false,
    summary: 'summary2',
    status: { name: 'statusName', statusCategory: { name: 'In Progress' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

const mockedIssue3 = forceCastTo<MinimalIssue<DetailedSiteInfo>>({
    key: 'AXON-3',
    isEpic: false,
    summary: 'summary3',
    status: { name: 'statusName', statusCategory: { name: 'Done' } },
    priority: { name: 'priorityName' },
    siteDetails: { id: 'siteDetailsId', baseLinkUrl: '/siteDetails/' },
    issuetype: { iconUrl: '/issueType/' },
    subtasks: [],
});

jest.mock('../../../container', () => ({
    Container: {
        jqlManager: {
            getCustomJQLEntries: jest.fn(() => mockJqlEntries),
            onDidJQLChange: () => {},
            updateFilters: jest.fn(),
            initializeJQL: () => {},
        },
        siteManager: {
            onDidSitesAvailableChange: () => {},
            productHasAtLeastOneSite: jest.fn(() => true),
        },
        context: {
            subscriptions: {
                push: jest.fn(),
            },
        },
        config: {
            jira: {
                explorer: {
                    nestSubtasks: false,
                },
            },
        },
    },
}));

jest.mock('../searchJiraHelper');

function forceCastTo<T>(obj: any): T {
    return obj as unknown as T;
}

describe('CustomJqlViewProvider', () => {
    let provider: CustomJQLViewProvider | undefined;

    beforeEach(() => {
        provider = undefined;
    });

    afterEach(() => {
        provider?.dispose();
        jest.restoreAllMocks();
    });

    describe('getChildren', () => {
        it('should return the list of custom JQLs as tree nodes', async () => {
            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(2);

            expect(children[0].label).toBe('Test JQL Entry');
            expect(children[1].label).toBe('Test JQL Entry 2');
        });

        it('should return a the list of issues under a jql node', async () => {
            jest.spyOn(utils, 'executeJqlQuery').mockResolvedValue([mockedIssue1, mockedIssue2, mockedIssue3]);

            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            const jqlNode = children[0];
            expect(jqlNode).toBeDefined();

            const issues = await provider.getChildren(jqlNode);
            expect(issues).toHaveLength(3);

            expect(issues[0].label).toBe(mockedIssue1.key);
            expect(issues[0].description).toBe(mockedIssue1.summary);
            expect(issues[0].contextValue).toBe('jiraIssue_todo');

            expect(issues[1].label).toBe(mockedIssue2.key);
            expect(issues[1].description).toBe(mockedIssue2.summary);
            expect(issues[1].contextValue).toBe('jiraIssue_inProgress');

            expect(issues[2].label).toBe(mockedIssue3.key);
            expect(issues[2].description).toBe(mockedIssue3.summary);
            expect(issues[2].contextValue).toBe('jiraIssue_done');
        });

        it("should return a 'No issues' node under a jql node without results", async () => {
            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            const jqlNode = children[0];
            expect(jqlNode).toBeDefined();

            const issues = await provider.getChildren(jqlNode);
            expect(issues).toHaveLength(1);

            expect(issues[0].label).toEqual('No issues match this query');
            expect(issues[0].command).toBeUndefined();
        });

        it("should return a 'Configure JQL entries' node if no jql entries are enabled", async () => {
            (Container.jqlManager.getCustomJQLEntries as jest.Mock).mockReturnValue([]);
            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(1);

            expect(children[0].label).toEqual('Configure JQL entries in settings to view Jira issues');
            expect(children[0].command).toBeDefined();
        });

        it("should return a 'Login to Jira' node if no sites are available", async () => {
            (Container.siteManager.productHasAtLeastOneSite as jest.Mock).mockReturnValue(false);
            provider = new CustomJQLViewProvider();
            const children = await provider.getChildren();

            expect(Container.jqlManager.getCustomJQLEntries).toHaveBeenCalled();
            expect(children).toHaveLength(1);

            expect(children[0].label).toEqual('Please login to Jira');
            expect(children[0].command).toBeDefined();
        });
    });

    describe('onDidJQLChange', () => {
        it('onDidJQLChange is registered during construction', async () => {
            let onDidJQLChangeCallback = undefined;
            jest.spyOn(Container.jqlManager, 'onDidJQLChange').mockImplementation((func: any, parent: any): any => {
                onDidJQLChangeCallback = (...args: any[]) => func.apply(parent, args);
            });

            provider = new CustomJQLViewProvider();

            expect(onDidJQLChangeCallback).toBeDefined();
        });
    });

    describe('onDidSitesAvailableChange', () => {
        it('onDidSitesAvailableChange is registered during construction', async () => {
            let onDidSitesAvailableChangeCallback = undefined;
            jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                (func: any, parent: any): any => {
                    onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                },
            );

            provider = new CustomJQLViewProvider();

            expect(onDidSitesAvailableChangeCallback).toBeDefined();
        });

        it('onDidSitesAvailableChange initializes the JQL query for the new Jira site', async () => {
            let onDidSitesAvailableChangeCallback = (...args: any[]) => {};
            jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                (func: any, parent: any): any => {
                    onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                },
            );

            provider = new CustomJQLViewProvider();

            const newSite = forceCastTo<DetailedSiteInfo>({ host: 'jira.atlassian.com', product: ProductJira });
            const evt: SitesAvailableUpdateEvent = forceCastTo<SitesAvailableUpdateEvent>({
                product: ProductJira,
                newSites: [newSite],
            });

            jest.spyOn(Container.jqlManager, 'initializeJQL');
            onDidSitesAvailableChangeCallback(evt);

            expect(Container.jqlManager.initializeJQL).toHaveBeenCalled();
        });

        it("onDidSitesAvailableChange doesn't do anything for a non-Jira site", async () => {
            let onDidSitesAvailableChangeCallback = (...args: any[]) => {};
            jest.spyOn(Container.siteManager, 'onDidSitesAvailableChange').mockImplementation(
                (func: any, parent: any): any => {
                    onDidSitesAvailableChangeCallback = (...args: any[]) => func.apply(parent, args);
                },
            );

            provider = new CustomJQLViewProvider();

            const newSite = forceCastTo<DetailedSiteInfo>({ host: 'bb.atlassian.com', product: ProductBitbucket });
            const evt: SitesAvailableUpdateEvent = forceCastTo<SitesAvailableUpdateEvent>({
                product: ProductBitbucket,
                newSites: [newSite],
            });

            jest.spyOn(Container.jqlManager, 'initializeJQL');
            onDidSitesAvailableChangeCallback(evt);

            expect(Container.jqlManager.initializeJQL).not.toHaveBeenCalled();
        });
    });
});
