import React from 'react'
import { Switch, Route, Link, useLocation } from 'react-router-dom'
import { AcmPage, AcmPageHeader, AcmSecondaryNav, AcmSecondaryNavItem } from '@open-cluster-management/ui-components'
import '@patternfly/react-core/dist/styles/base.css'
import YAMLPage from './YAMLPage'
import LogsPage from './LogsPage'
import { consoleClient } from '../../console-sdk/console-client'
import { useGetResourceQuery } from '../../console-sdk/console-sdk'

function getResourceData() {
    const baseSegments = window.location.pathname.split('/').slice(2)
    if (baseSegments[baseSegments.length - 1] === 'logs') {
        baseSegments.pop()
    }
    const selfLink = '/' + baseSegments.slice(1).join('/')
    const cluster = baseSegments[0]
    const name = baseSegments[baseSegments.length - 1]
    const kind = baseSegments[baseSegments.length - 2]
    const namespace = baseSegments[baseSegments.length - 4] === 'namespaces'
        ? baseSegments[baseSegments.length - 3]
        : ''
    return { cluster, selfLink, namespace, kind, name }
}

export default function DetailsPage() {
    const { cluster, selfLink, namespace, kind, name } = getResourceData()
    const getResourceResponse = useGetResourceQuery({
        client: consoleClient,
        variables: {
            kind,
            name,
            namespace,
            cluster,
            selfLink,
        },
    });
    const location = useLocation()

    return (
        <AcmPage>
            {/* TODO - can we go back to previous search? instead of search hompage?  */}
            <AcmPageHeader
                title={name}
                breadcrumb={[ { text: 'Search', to: '/search' } ]}
                navigation={
                    <AcmSecondaryNav>
                        <AcmSecondaryNavItem
                            isActive={location.pathname === `/resources/${cluster}${selfLink}`} >
                            <Link to={`/resources/${cluster}${selfLink}`}>YAML</Link>
                        </AcmSecondaryNavItem>
                        {kind === 'pods'
                            ? <AcmSecondaryNavItem
                                isActive={location.pathname === `/resources/${cluster}${selfLink}/logs`} >
                                <Link to={`/resources/${cluster}${selfLink}/logs`}>Logs</Link>
                            </AcmSecondaryNavItem>
                            : null}
                    </AcmSecondaryNav>
                } />
            <Switch>
                <Route exact path={`/resources/${cluster}${selfLink}`}>
                    <YAMLPage
                        resource={getResourceResponse.data}
                        loading={getResourceResponse.loading}
                        error={getResourceResponse.error}
                        name={name}
                        cluster={cluster}
                        namespace={namespace} />
                </Route>
                <Route path={`/resources/${cluster}${selfLink}/logs`}>
                    <LogsPage
                        containers={getResourceResponse.data?.getResource?.spec.containers.map((container: any) => container.name) || []}
                        cluster={cluster}
                        namespace={namespace}
                        name={name} />
                </Route>
            </Switch>
        </AcmPage>
    )
}
