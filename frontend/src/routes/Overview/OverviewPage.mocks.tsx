import { GraphQLError } from 'graphql'
import { GetResourceDocument, GetOverviewDocument } from '../../console-sdk/console-sdk'
import { SearchResultCountDocument } from '../../search-sdk/search-sdk'

const mockGetOverviewQuery = {
    request: {
        query: GetOverviewDocument,
    },
    result: {
        data: {
            overview: {
                clusters: [
                    {
                        metadata: {
                            name: 'local-cluster',
                            namespace: 'local-cluster',
                            labels: {
                                cloud: 'Amazon',
                                clusterID: '0423d368-1f67-4300-bd26-05955bbbbf58',
                                'installer.name': 'multiclusterhub',
                                'installer.namespace': 'open-cluster-management',
                                'local-cluster': 'true',
                                name: 'local-cluster',
                                vendor: 'OpenShift',
                                region: 'Other',
                                environment: 'Other',
                            },
                            uid: null,
                            __typename: 'Metadata',
                        },
                        consoleURL: 'https://console-openshift-console.apps.mock-cluster-name.com',
                        status: 'ok',
                        __typename: 'ClusterOverview',
                    },
                    {
                        metadata: {
                            name: 'managed-cluster',
                            namespace: 'managed-cluster',
                            labels: {
                                cloud: 'Azure',
                                clusterID: '1111-2222-3333-4444',
                                'installer.name': 'multiclusterhub',
                                'installer.namespace': 'open-cluster-management',
                                'local-cluster': 'false',
                                name: 'managed-cluster',
                                vendor: 'OpenShift',
                                region: 'Other',
                                environment: 'Other',
                            },
                            uid: null,
                            __typename: 'Metadata',
                        },
                        consoleURL: 'https://console-openshift-console.apps.mock-cluster-name.com',
                        status: 'ok',
                        __typename: 'ClusterOverview',
                    },
                ],
                applications: [
                    {
                        metadata: {
                            name: 'nginx-app-3',
                            namespace: null,
                            __typename: 'Metadata',
                        },
                        raw: null,
                        selector: null,
                        __typename: 'ApplicationOverview',
                    },
                ],
                compliances: [
                    {
                        metadata: null,
                        raw: {
                            status: {
                                status: [
                                    {
                                        clustername: 'local-cluster',
                                        clusternamespace: 'local-cluster',
                                        compliant: 'Compliant',
                                    },
                                    {
                                        clustername: 'managed-cluster',
                                        clusternamespace: 'managed-cluster',
                                        compliant: 'NonCompliant',
                                    },
                                ],
                            },
                        },
                        __typename: 'ComplianceOverview',
                    },
                ],
                timestamp: 'Wed Jan 13 2021 13:19:40 GMT+0000 (Coordinated Universal Time)',
                __typename: 'Overview',
            },
        },
    },
}
const mockGetResourceQuery = {
    request: {
        query: GetResourceDocument,
        variables: {
            selfLink: '/apis/addon.open-cluster-management.io/v1alpha1/clustermanagementaddons',
            namespace: 'open-cluster-management',
            name: '',
            cluster: 'local-cluster',
            kind: '',
        },
    },
    response: {
        data: {
            getResource: {
                apiversion: 'addon.open-cluster-management.io/v1alpha1',
                kind: 'ClusterManagementAddOnList',
                items: [
                    {
                        apiversion: 'addon.open-cluster-management.io/v1alpha1',
                        kind: 'ClusterManagementAddOn',
                        spec: {
                            addOnConfiguration: {
                                crName: '',
                                crdName: 'klusterletaddonconfigs.agent.open-cluster-management.io',
                            },
                            addOnMeta: {
                                description: 'Processes events and other requests to managed resources.',
                                displayName: 'Application Manager',
                            },
                        },
                    },
                ],
            },
        },
    },
}

const mockSearchResultCountQuery = {
    request: {
        query: SearchResultCountDocument,
        variables: {
            input: [
                {
                    keywords: [],
                    filters: [
                        {
                            property: 'kind',
                            values: ['node'],
                        },
                    ],
                },
                {
                    keywords: [],
                    filters: [
                        {
                            property: 'kind',
                            values: ['pod'],
                        },
                    ],
                },
                {
                    keywords: [],
                    filters: [
                        {
                            property: 'kind',
                            values: ['pod'],
                        },
                        {
                            property: 'status',
                            values: ['Running', 'Completed'],
                        },
                    ],
                },
                {
                    keywords: [],
                    filters: [
                        {
                            property: 'kind',
                            values: ['pod'],
                        },
                        {
                            property: 'status',
                            values: ['Pending', 'ContainerCreating', 'Waiting', 'Terminating'],
                        },
                    ],
                },
                {
                    keywords: [],
                    filters: [
                        {
                            property: 'kind',
                            values: ['pod'],
                        },
                        {
                            property: 'status',
                            values: [
                                'Failed',
                                'CrashLoopBackOff',
                                'ImagePullBackOff',
                                'Terminated',
                                'OOMKilled',
                                'Unknown',
                            ],
                        },
                    ],
                },
            ],
        },
    },
    result: {
        data: {
            searchResult: [
                {
                    count: 6,
                    __typename: 'SearchResult',
                },
                {
                    count: 335,
                    __typename: 'SearchResult',
                },
                {
                    count: 335,
                    __typename: 'SearchResult',
                },
                {
                    count: 0,
                    __typename: 'SearchResult',
                },
                {
                    count: 0,
                    __typename: 'SearchResult',
                },
            ],
        },
    },
}

export const mockErrorState = [
    {
        request: {
            query: GetOverviewDocument,
        },
        result: {
            errors: [new GraphQLError('Error getting overview data')],
        },
    },
    mockGetResourceQuery,
    mockSearchResultCountQuery,
]

export const mockValidState = [mockSearchResultCountQuery, mockGetResourceQuery, mockGetOverviewQuery]
