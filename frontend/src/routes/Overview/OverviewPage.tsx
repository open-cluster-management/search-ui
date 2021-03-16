// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import React, { Dispatch, Fragment, SetStateAction, useEffect, useState } from 'react'
import {
    AcmAlert,
    AcmChartGroup,
    AcmDonutChart,
    AcmLoadingPage,
    AcmPage,
    AcmPageHeader,
    AcmOverviewProviders,
    AcmScrollable,
    AcmSummaryList,
    Provider,
    AcmButton,
    AcmActionGroup,
    AcmLaunchLink,
    AcmAutoRefreshSelect,
    AcmRefreshTime,
} from '@open-cluster-management/ui-components'
import { ButtonVariant, PageSection } from '@patternfly/react-core'
import { PlusIcon } from '@patternfly/react-icons'
import { useTranslation } from 'react-i18next'
import { consoleClient } from '../../console-sdk/console-client'
import { useGetOverviewLazyQuery, useGetResourceQuery } from '../../console-sdk/console-sdk'
import { useSearchResultCountLazyQuery } from '../../search-sdk/search-sdk'
import { searchClient } from '../../search-sdk/search-client'
import { ClusterManagementAddOn } from '../../lib/resource-request'
import _ from 'lodash'

export function mapProviderFromLabel(provider: string): Provider {
    switch (provider) {
        case 'Amazon':
            return Provider.aws
        case 'Azure':
            return Provider.azure
        case 'Baremetal':
            return Provider.baremetal
        case 'Google':
            return Provider.gcp
        case 'IBM':
            return Provider.ibm
        case 'RedHat':
            return Provider.redhatcloud
        case 'VMware':
            return Provider.vmware
        case 'OpenStack':
            return Provider.openstack
        default:
            return Provider.other
    }
}

function getClusterSummary(clusters: any, selectedCloud: string, setSelectedCloud: Dispatch<SetStateAction<string>>) {
    return clusters.reduce(
        (prev: any, curr: any, index: number) => {
            // Data for Providers section.
            const cloud = curr.metadata?.labels?.cloud || 'other'
            const provider = prev.providers.find((p: any) => p.provider === mapProviderFromLabel(cloud))
            if (provider) {
                provider.clusterCount = provider.clusterCount + 1
            } else {
                prev.providers.push({
                    provider: mapProviderFromLabel(cloud),
                    clusterCount: 1,
                    isSelected: selectedCloud === cloud,
                    onClick: () => {
                        // Clicking on the selected cloud card will remove the selection.
                        selectedCloud === cloud ? setSelectedCloud('') : setSelectedCloud(cloud)
                    },
                })
            }

            // Collect stats if cluster matches selected cloud filter. Defaults to all.
            if (selectedCloud === '' || selectedCloud === cloud) {
                // Data for Summary section.
                prev.clusterNames.add(curr.metadata.name)
                prev.kubernetesTypes.add(curr.metadata.labels.vendor)
                prev.regions.add(curr.metadata.labels.region)

                // Data for Cluster status pie chart.
                if (curr.status === 'ok') {
                    prev.ready = prev.ready + 1
                } else {
                    prev.offline = prev.offline + 1
                }
            }
            return prev
        },
        {
            kubernetesTypes: new Set(),
            regions: new Set(),
            ready: 0,
            offline: 0,
            providerCounts: {},
            providers: [],
            clusterNames: new Set(),
        }
    )
}

const searchQueries = (selectedClusters: Array<string>): Array<any> => {
    const baseSearchQueries = [
        { keywords: [], filters: [{ property: 'kind', values: ['node'] }] },
        { keywords: [], filters: [{ property: 'kind', values: ['pod'] }] },
        {
            keywords: [],
            filters: [
                { property: 'kind', values: ['pod'] },
                { property: 'status', values: ['Running', 'Completed'] },
            ],
        },
        {
            keywords: [],
            filters: [
                { property: 'kind', values: ['pod'] },
                { property: 'status', values: ['Pending', 'ContainerCreating', 'Waiting', 'Terminating'] },
            ],
        },
        {
            keywords: [],
            filters: [
                { property: 'kind', values: ['pod'] },
                {
                    property: 'status',
                    values: ['Failed', 'CrashLoopBackOff', 'ImagePullBackOff', 'Terminated', 'OOMKilled', 'Unknown'],
                },
            ],
        },
    ]

    if (selectedClusters?.length > 0) {
        baseSearchQueries.forEach((query) => {
            query.filters.push({ property: 'cluster', values: selectedClusters })
        })
    }
    return baseSearchQueries
}

const PageActions = (props: { timestamp: string; reloading: boolean; refetch: () => void }) => {
    const { t } = useTranslation(['overview'])
    const { data, error } = useGetResourceQuery({
        client: consoleClient,
        variables: {
            selfLink: '/apis/addon.open-cluster-management.io/v1alpha1/clustermanagementaddons',
            namespace: 'open-cluster-management',
            name: null,
            cluster: 'local-cluster',
            kind: null,
        },
    })
    if (error) {
        // TODO: Better error handling
        console.error(error)
    }

    function getLaunchLink(addons: ClusterManagementAddOn[]) {
        const pathKey = 'console.open-cluster-management.io/launch-link'
        const textKey = 'console.open-cluster-management.io/launch-link-text'
        if (addons && addons.filter((addon) => addon.metadata.name === 'observability-controller')) {
            return addons
                ?.filter((addon) => addon.metadata.name === 'observability-controller')
                ?.map((addon) => ({
                    id: addon.metadata.annotations![textKey] ?? '',
                    text: addon.metadata.annotations![textKey] ?? '',
                    href: addon.metadata.annotations![pathKey] ?? '',
                }))
        } else {
            return undefined
        }
    }
    const clusterAddons = data?.getResource?.items

    return (
        <Fragment>
            <AcmActionGroup>
                {!error && <AcmLaunchLink links={getLaunchLink(clusterAddons)} />}
                <AcmButton
                    href="/multicloud/add-connection"
                    variant={ButtonVariant.link}
                    component="a"
                    rel="noreferrer"
                    id="add-provider-connection"
                    icon={<PlusIcon />}
                    iconPosition="left"
                >
                    {t('overview.add.provider')}
                </AcmButton>
                <AcmAutoRefreshSelect refetch={props.refetch} refreshIntervals={[30, 60, 5 * 60, 30 * 60, 0]} />
            </AcmActionGroup>
            <AcmRefreshTime timestamp={props.timestamp} reloading={props.reloading} />
        </Fragment>
    )
}

export default function OverviewPage() {
    const { t } = useTranslation(['overview'])
    const [clusters, setClusters] = useState<any[]>([])
    const [selectedCloud, setSelectedCloud] = useState<string>('')
    const [selectedClusterNames, setSelectedClusterNames] = useState<string[]>([])
    const [summaryData, setSummaryData] = useState<any>({
        kubernetesTypes: new Set(),
        regions: new Set(),
        ready: 0,
        offline: 0,
        providers: [],
    })

    // CONSOLE-API
    const [fireConsoleQuery, { data, loading, error, refetch, called }] = useGetOverviewLazyQuery({
        client: process.env.NODE_ENV === 'test' ? undefined : consoleClient,
    })
    useEffect(() => {
        if (!called) {
            fireConsoleQuery()
        } else {
            refetch && refetch()
        }
    }, [called, fireConsoleQuery, refetch])

    const timestamp = data?.overview?.timestamp as string
    if (!_.isEqual(clusters, data?.overview?.clusters || [])) {
        setClusters(data?.overview?.clusters || [])
    }

    const nonCompliantClusters = new Set<string>()
    data?.overview?.compliances?.forEach((c) => {
        c?.raw?.status?.status?.forEach((i: { clustername: string; clusternamespace: string; compliant?: string }) => {
            if (selectedClusterNames.length === 0 || selectedClusterNames.includes(i.clustername)) {
                if (i.compliant === 'NonCompliant') {
                    nonCompliantClusters.add(i.clustername)
                }
            }
        })
    })
    const tempClusters = selectedClusterNames.length > 0 ? selectedClusterNames : clusters.map((c) => c.metadata?.name)
    const compliantClusters = tempClusters.filter((c) => !nonCompliantClusters.has(c))

    // SEARCH-API
    const [
        fireSearchQuery,
        { called: searchCalled, data: searchData, loading: searchLoading, error: searchError, refetch: searchRefetch },
    ] = useSearchResultCountLazyQuery({
        client: process.env.NODE_ENV === 'test' ? undefined : searchClient,
    })

    useEffect(() => {
        if (!called && !searchCalled) {
            // The console call needs to finish first.
            fireSearchQuery({
                variables: { input: searchQueries(selectedClusterNames) },
            })
        } else {
            searchRefetch &&
                searchRefetch({
                    input: searchQueries(selectedClusterNames),
                })
        }
    }, [fireSearchQuery, called, selectedClusterNames, searchCalled, searchRefetch])
    const searchResult = searchData?.searchResult || []

    // Process data from API.
    useEffect(() => {
        const clusterSummary = getClusterSummary(clusters || [], selectedCloud, setSelectedCloud)
        setSummaryData(clusterSummary)

        const { clusterNames } = clusterSummary
        if (selectedCloud === '') {
            if (!_.isEqual(selectedClusterNames, [])) {
                setSelectedClusterNames([])
            }
        } else if (!_.isEqual(selectedClusterNames, Array.from(clusterNames))) {
            setSelectedClusterNames(Array.from(clusterNames))
        }
    }, [clusters, selectedCloud, data, searchData, selectedClusterNames])

    const refetchData = () => {
        refetch && refetch()
        searchRefetch && searchRefetch({ input: searchQueries(selectedClusterNames) })
    }

    const { kubernetesTypes, regions, ready, offline, providers } = summaryData

    const cloudLabelFilter: string = selectedCloud === '' ? '' : `%20label%3acloud=${selectedCloud}`
    function buildSummaryLinks(kind: string) {
        return selectedCloud === ''
            ? `/search?filters={"textsearch":"kind%3A${kind}"}`
            : `/search?filters={"textsearch":"kind%3Acluster${cloudLabelFilter}"}&showrelated=${kind}`
    }
    const summary =
        loading || searchLoading
            ? []
            : [
                  {
                      isPrimary: false,
                      description: 'Applications',
                      count: data?.overview?.applications?.length || 0,
                      href: buildSummaryLinks('application'),
                  },
                  {
                      isPrimary: false,
                      description: 'Clusters',
                      count:
                          selectedClusterNames.length > 0
                              ? selectedClusterNames.length
                              : data?.overview?.clusters?.length || 0,
                      href: `search?filters={"textsearch":"kind%3Acluster${cloudLabelFilter}"}`,
                  },
                  { isPrimary: false, description: 'Kubernetes type', count: kubernetesTypes?.size },
                  { isPrimary: false, description: 'Region', count: regions?.size },
                  {
                      isPrimary: false,
                      description: 'Nodes',
                      count: searchResult[0]?.count || 0,
                      href: buildSummaryLinks('node'),
                  },
                  {
                      isPrimary: false,
                      description: 'Pods',
                      count: searchResult[1]?.count || 0,
                      href: buildSummaryLinks('pod'),
                  },
              ]

    // TODO: Breaks url if length of selectedClustersFilter is too big.
    // Issue: https://github.com/open-cluster-management/backlog/issues/7087
    const urlClusterFilter: string =
        selectedClusterNames.length > 0 ? `%20cluster%3A${selectedClusterNames.join(',')}` : ''
    const podData =
        loading || searchLoading
            ? []
            : [
                  {
                      key: 'Running',
                      value: searchResult[2]?.count || 0,
                      isPrimary: true,
                      link: `/search?filters={"textsearch":"kind%3Apod%20status%3ARunning%2CCompleted${urlClusterFilter}"}`,
                  },
                  {
                      key: 'Pending',
                      value: searchResult[3]?.count || 0,
                      link: `/search?filters={"textsearch":"kind%3Apod%20status%3AContainerCreating%2CPending%2CTerminating%2CWaiting${urlClusterFilter}"}`,
                  },
                  {
                      key: 'Failed',
                      value: searchResult[4]?.count || 0,
                      isDanger: true,
                      link: `/search?filters={"textsearch":"kind%3Apod%20status%3ACrashLoopBackOff%2CFailed%2CImagePullBackOff%2CRunContainerError%2C
Terminated%2CUnknown%2COOMKilled${urlClusterFilter}"}`,
                  },
              ]

    // TODO: Breaks url if length of selectedClustersFilter is too big.
    // Issue: https://github.com/open-cluster-management/backlog/issues/7087
    function buildNamesFilter(names: Array<string> = []): string {
        return names.length > 0 ? `%20name:${names.join(',')}` : ''
    }
    function buildClusterComplianceLinks(clusterNames: Array<string> = []): string {
        return `/search?filters={"textsearch":"kind:cluster${buildNamesFilter(clusterNames)}"}&showrelated=policy`
    }
    const complianceData =
        loading || searchLoading
            ? []
            : [
                  {
                      key: 'Compliant',
                      value: compliantClusters.length,
                      isPrimary: true,
                      link: buildClusterComplianceLinks(compliantClusters),
                  },
                  {
                      key: 'Non-compliant',
                      value: nonCompliantClusters.size,
                      isDanger: true,
                      link: buildClusterComplianceLinks(Array.from(nonCompliantClusters)),
                  },
              ]

    const clusterData =
        loading || searchLoading
            ? []
            : [
                  {
                      key: 'Ready',
                      value: ready,
                      isPrimary: true,
                      link: `/search?filters={"textsearch":"kind%3Acluster%20ManagedClusterConditionAvailable%3ATrue${cloudLabelFilter}"}`,
                  },
                  {
                      key: 'Offline',
                      value: offline,
                      isDanger: true,
                      link: `/search?filters={"textsearch":"kind%3Acluster%20ManagedClusterConditionAvailable%3A!True${cloudLabelFilter}"}`,
                  },
              ]

    if (error || searchError) {
        return (
            <AcmPage>
                <AcmPageHeader
                    title={t('overview')}
                    actions={<PageActions timestamp={timestamp} reloading={loading} refetch={refetchData} />}
                />
                <PageSection>
                    <AcmAlert
                        noClose
                        isInline
                        variant={'danger'}
                        title={t('overview.data.error.title')}
                        subtitle={t('overview.data.error.message')}
                    />
                </PageSection>
            </AcmPage>
        )
    }

    return (
        <AcmPage>
            <AcmPageHeader
                title={t('overview')}
                actions={
                    <PageActions timestamp={timestamp} reloading={loading || searchLoading} refetch={refetchData} />
                }
            />
            <AcmScrollable>
                {!called || loading || searchLoading ? (
                    <AcmLoadingPage />
                ) : (
                    <PageSection>
                        <AcmOverviewProviders providers={providers} />
                    </PageSection>
                )}

                <PageSection>
                    {!called || loading || searchLoading ? (
                        <AcmSummaryList key="loading" loading title={t('overview.summary.title')} list={summary} />
                    ) : (
                        <AcmSummaryList title={t('overview.summary.title')} list={summary} />
                    )}
                </PageSection>

                <PageSection>
                    {!called || loading || searchLoading ? (
                        <AcmChartGroup>
                            <AcmDonutChart
                                loading
                                key="chart-loading-1"
                                title="Cluster compliance"
                                description={t('overview.donut.compliance.description', {
                                    compliance: 'policy compliance',
                                })}
                                data={[]}
                            />
                            <AcmDonutChart
                                loading
                                key="chart-loading-2"
                                title="Pods"
                                description={t('overview.donut.pod.description', { pod: 'pod' })}
                                data={[]}
                            />
                            <AcmDonutChart
                                loading
                                key="chart-loading-3"
                                title="Cluster status"
                                description={t('overview.donut.status.description', { cluster: 'cluster' })}
                                data={[]}
                            />
                        </AcmChartGroup>
                    ) : (
                        <AcmChartGroup>
                            <AcmDonutChart
                                title="Cluster compliance"
                                description={t('overview.donut.compliance.description', {
                                    compliance: 'policy compliance',
                                })}
                                data={complianceData}
                            />
                            <AcmDonutChart
                                title="Pods"
                                description={t('overview.donut.pod.description', { pod: 'pod' })}
                                data={podData}
                            />
                            <AcmDonutChart
                                title="Cluster status"
                                description={t('overview.donut.status.description', { cluster: 'cluster' })}
                                data={clusterData}
                            />
                        </AcmChartGroup>
                    )}
                </PageSection>
            </AcmScrollable>
        </AcmPage>
    )
}
