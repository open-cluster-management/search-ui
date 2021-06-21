// Copyright (c) 2021 Red Hat, Inc.
// Copyright Contributors to the Open Cluster Management project
import React, { useState, Fragment, cloneElement, useEffect } from 'react'
import '@patternfly/react-core/dist/styles/base.css'
import { useTranslation } from 'react-i18next'
import { useGetMessagesQuery, Message } from '../../../search-sdk/search-sdk'
import { AcmAlert, AcmButton, AcmDrawer, AcmLabels, AcmPageContent, AcmPageHeader, AcmAlertGroup, AcmExpandableCard, AcmInlineStatus, StatusType} from '@open-cluster-management/ui-components'
import { empty, gql, useQuery } from '@apollo/client'
import { searchClient } from '../../../search-sdk/search-client'
import { Alert, AlertGroup, AlertVariant, Popover, PopoverPosition, Button, Card, CardBody, Flex} from '@patternfly/react-core';
import { type } from '@testing-library/user-event/dist/type'
import { convertToObject } from 'typescript'


// 1. Needed to export as default function.
export default function HeaderWithNotification(props: {showMessages:{}}) {
    const msgQuery = useGetMessagesQuery({
        client: process.env.NODE_ENV === 'test' ? undefined : searchClient
    })
    // const[showMessage, setShowMessages] = useState<string[]>([])

    const { t } = useTranslation(['search'])

    // 2. Needed to extract `messages` from the `msgQuery`
    const messages = msgQuery.data?.messages

    

    // const handleAlertClose = (messageId:string) => {
    //     showMessage.push(messageId)
    //     setShowMessages(showMessage)
        // localStorage.setItem(refreshIntervalCookie, `${pollInterval}`)
    // }

//     return (
//     <div>   
//             {messages?.map(msg => { //mapping every element in array 
//                 if (minimizedMessages.indexOf(msg?.id || '') > 0) {
//                     // Message is minimized.
//                     const displayText = t(`messages.${msg?.id}.short`)
//                     return(<AcmLabels labels={{displayText}}/>)
//                 }
//                 // Display the message as an alert.
//                 const displayText = t(`messages.${msg?.id}.long`)
//                 return(
//                     <Alert key={msg?.id} title={displayText} 
//                     actionClose={<AlertActionCloseButton onClose={() => handleAlertClose(msg?.id)}/>}/>
//                 )
//             })}
          
//         </div>
//     )
// }
    return (
        <div>
        <div style={{outline: "none", display: 'flex', justifyContent:'flex-end'}}>
        <p style={{flex: 1}}><AcmPageHeader title={t('search')}/></p>

        {messages?.map(msg => {
                const displayShortText = t(`messages.${msg?.id}.short`)
                const displayLongText = t(`messages.${msg?.id}.long`)

            return (
        
            <Card style= {{ border: "none", boxShadow: "none"}} > 
                <CardBody>
                    <AcmInlineStatus
                        type={StatusType.warning}
                        status={displayShortText}
                        popover={{
                            headerContent: (
                                <div>{displayShortText}</div>
                            ),
                            bodyContent: (
                                <div>{displayLongText}</div>
                                ),
                            footerContent: (
                                <a href='/search?filters={"textsearch":"kind%3Acluster%20addon%3Asearch-collector%3Dfalse%20name%3A!local-cluster"}'>
                                    View disabled clusters
                                </a>
                            ),
                                }}
                    />
                </CardBody>
            </Card>
                    )
                    })}
            </div>
        </div>
    
    )
}





    {/* // <div style={{display: 'flex', justifyContent:'flex-end'}}>
    // <Popover
    //     hasAutoWidth
    //     bodyContent={hide => <div>Currently, search is disabled on some of your managed clusters. Some data might be missing from the console view. See ______ to enable search.</div>}
    // >
    //     <Button>More on disabled clusters.</Button>
    // </Popover>
    //  </div> */}





// Option one:
// export const HeaderWithNotification: React.FC<any> = (onClose) => {
//     const msgQuery = useGetMessagesQuery({
//         client: process.env.NODE_ENV === 'test' ? undefined : searchClient
//     })
//     //using translations:
//     const { t } = useTranslation(['search'])
//     const displayTextShort = t('messages.S20.short')
//     const displayTextLong = t('messages.S20.long') 


    
//     const[message, setMessage] = useState<string>(displayTextLong) //initial state to long text
//     const toggleMessage = () =>  setMessage(message === displayTextLong ? displayTextShort : displayTextLong) //setMessage will
//     // console.log(messages.length)


//     return (
//         <div>
//             {[messages].length > 0 && message === displayTextShort && 
//             <AcmLabels labels={{displayTextShort}}/>}
//             {[messages].length > 0 && message === displayTextLong && 
//              <Alert title={displayTextLong} 
//             actionClose={<AlertActionCloseButton onClose={() => toggleMessage()}/>}/>}
//         </div>
//     )
// }