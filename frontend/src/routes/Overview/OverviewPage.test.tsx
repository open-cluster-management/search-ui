// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import React from 'react'
import { Router } from 'react-router-dom'
import { createBrowserHistory } from 'history'
import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { wait } from '../../lib/test-helper'
import OverviewPage, { mapProviderFromLabel } from './OverviewPage'
import { mockErrorState, mockValidState } from './OverviewPage.mocks'

describe('Overview Page functions', () => {
    it('should responsed with correct value for mapProviderFromLabel function', () => {
        expect(mapProviderFromLabel('Amazon')).toEqual('aws')
        expect(mapProviderFromLabel('Azure')).toEqual('azure')
        expect(mapProviderFromLabel('Baremetal')).toEqual('baremetal')
        expect(mapProviderFromLabel('Google')).toEqual('gcp')
        expect(mapProviderFromLabel('IBM')).toEqual('ibm')
        expect(mapProviderFromLabel('RedHat')).toEqual('redhatcloud')
        expect(mapProviderFromLabel('VMware')).toEqual('vmware')
        expect(mapProviderFromLabel('other')).toEqual('other')
    })
})

describe('Overview Page', () => {
    it('should render in loading state', async () => {
        render(
            <Router history={createBrowserHistory()}>
                <MockedProvider mocks={mockValidState}>
                    <OverviewPage />
                </MockedProvider>
            </Router>
        )
        // Test the loading state while apollo query finishes
        expect(screen.getByText('Loading')).toBeInTheDocument()

        await wait()
        expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    it('should render in error state', async () => {
        const origConsole = console.error
        console.error = jest.fn() // console.error messages won't flood test results.
        render(
            <Router history={createBrowserHistory()}>
                <MockedProvider mocks={mockErrorState}>
                    <OverviewPage />
                </MockedProvider>
            </Router>
        )
        // Test the loading state while apollo query finishes
        expect(screen.getByText('Loading')).toBeInTheDocument()
        // This wait pauses till apollo query is returning data
        await wait()
        // Test that the component has rendered correctly with an error
        await waitFor(() => expect(screen.queryByText('overview.data.error.title')).toBeTruthy())

        expect(console.error).toBeCalledTimes(2)
        console.error = origConsole // restore console.error to original.
    })

    it('should render overview page with expected data', async () => {
        const { getAllByText, getByText, queryByText } = render(
            <Router history={createBrowserHistory()}>
                <MockedProvider mocks={mockValidState}>
                    <OverviewPage />
                </MockedProvider>
            </Router>
        )
        // Test the loading state while apollo query finishes
        expect(getByText('Loading')).toBeInTheDocument()
        // This wait pauses till apollo query is returning data
        await wait()
        // Test that the component has rendered correctly with an error
        expect(queryByText('Amazon')).toBeTruthy()

        // Check Cluster compliance chart rendered
        expect(getAllByText('Cluster compliance')).toHaveLength(2)
        expect(getByText('1 Compliant')).toBeTruthy()
        expect(getByText('1 Non-compliant')).toBeTruthy()
    })
})
