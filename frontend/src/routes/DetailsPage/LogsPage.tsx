import { useState } from 'react'
import { PageSection } from '@patternfly/react-core'
import { AcmAlert, AcmLogWindow, AcmLoadingPage } from '@stolostron/ui-components'
import { useTranslation } from 'react-i18next'
import { useGetLogsQuery } from '../../console-sdk/console-sdk'
import { consoleClient } from '../../console-sdk/console-client'

export default function LogsPage(props: { containers: string[]; cluster: string; namespace: string; name: string }) {
    const { containers, cluster, namespace, name } = props
    const { t } = useTranslation(['details'])
    const [container, setContainer] = useState<string>(containers[0] || '')
    const { data, loading, error } = useGetLogsQuery({
        client: process.env.NODE_ENV === 'test' ? undefined : consoleClient,
        skip: containers.length === 0 || !container,
        variables: {
            containerName: container,
            podName: name,
            podNamespace: namespace,
            clusterName: cluster,
        },
    })
    if (error) {
        return (
            <PageSection>
                <AcmAlert
                    noClose={true}
                    variant={'danger'}
                    isInline={true}
                    title={`${t('logs.request.error')} ${name}`}
                    subtitle={error.message}
                />
            </PageSection>
        )
    }
    if (loading) {
        return (
            <PageSection>
                <AcmLoadingPage />
            </PageSection>
        )
    }

    return (
        <PageSection>
            <AcmLogWindow
                id={'pod-logs-viewer'}
                cluster={cluster}
                namespace={namespace}
                initialContainer={container}
                onSwitchContainer={(newContainer: string | undefined) => setContainer(newContainer || container)}
                containers={containers}
                logs={data?.logs || ''}
            />
        </PageSection>
    )
}
