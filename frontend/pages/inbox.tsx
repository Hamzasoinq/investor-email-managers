import { useState, useCallback } from 'react'
import {
  Box,
  Heading,
  Button,
  HStack,
  useToast,
  Spinner,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Input,
  Select,
  VStack
} from '@chakra-ui/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import debounce from 'lodash/debounce'
import Layout from '../components/Layout'
import EmailList from '../components/EmailList'
import EmailDetail from '../components/EmailDetail'
import ComposeEmail from '../components/ComposeEmail'
import api, { PiplEmail } from '../lib/api'

export default function Inbox() {
  const toast = useToast()
  const queryClient = useQueryClient()
  const [selectedEmail, setSelectedEmail] = useState<PiplEmail | null>(null)
  const { isOpen: isComposeOpen, onOpen: onComposeOpen, onClose: onComposeClose } = useDisclosure()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('date')
  const [filterLabel, setFilterLabel] = useState('')

  // Fetch emails with simple query
  const {
    data: emails = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['emails', searchTerm, sortBy, filterLabel],
    queryFn: async () => {
      const response = await api.emails.list({
        preview_only: true,
        email_type: 'all',
        label: filterLabel || undefined
      })
      return response
    },
    staleTime: 30000 // Consider data fresh for 30 seconds
  })

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value)
    }, 300),
    []
  )

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: api.emails.send,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
      onComposeClose()
      toast({
        title: 'Email sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to send email',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    }
  })

  // Mark email as read mutation
  const markReadMutation = useMutation({
    mutationFn: api.emails.markRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emails'] })
    },
    onError: (error) => {
      console.error('Error marking email as read:', error)
    }
  })

  const handleEmailSelect = async (email: PiplEmail) => {
    try {
      // Fetch full email content
      const fullEmail = await api.emails.list({
        preview_only: false,
        email_type: 'all',
        lead_email: email.from_address_email
      }).then(emails => emails.find(e => e.id === email.id))

      setSelectedEmail(fullEmail || email)

      if (email.is_unread && email.thread_id) {
        await markReadMutation.mutateAsync(email.thread_id)
      }
    } catch (error) {
      console.error('Error fetching full email content:', error)
      toast({
        title: 'Error loading email content',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      setSelectedEmail(email) // Fallback to preview version
    }
  }

  const handleSendEmail = async (data: {
    to: string
    subject: string
    body: string
    replyToId?: string
  }) => {
    await sendEmailMutation.mutateAsync(data)
  }

  return (
    <Layout>
      <Box py={4} px={6} h="100vh" maxH="100vh" overflow="hidden">
        <VStack spacing={4} h="full">
          <HStack justify="space-between" w="full">
            <Heading size="lg">Inbox</Heading>
            <Button colorScheme="blue" onClick={onComposeOpen}>
              Compose
            </Button>
          </HStack>

          <HStack spacing={4} w="full">
            <Input
              placeholder="Search emails..."
              onChange={(e) => debouncedSearch(e.target.value)}
              maxW="400px"
            />
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              w="160px"
            >
              <option value="date">Sort by Date</option>
              <option value="sender">Sort by Sender</option>
              <option value="subject">Sort by Subject</option>
            </Select>
            <Select
              value={filterLabel}
              onChange={(e) => setFilterLabel(e.target.value)}
              w="160px"
              placeholder="Filter by Label"
            >
              <option value="">All</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="MEETING_BOOKED">Meeting Booked</option>
              <option value="FOLLOW_UP">Follow Up</option>
              <option value="WRONG_PERSON">Wrong Person</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="NOT_QUALIFIED">Not Qualified</option>
              <option value="CONTACTED">Contacted</option>
              <option value="RESPONDED">Responded</option>
              <option value="NO_RESPONSE">No Response</option>
            </Select>
          </HStack>

          {error ? (
            <Alert status="error">
              <AlertIcon />
              <AlertTitle>Error loading emails</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'An error occurred'}
              </AlertDescription>
            </Alert>
          ) : (
            <HStack align="flex-start" spacing={4} w="full" h="calc(100vh - 140px)" overflow="hidden">
              <Box w="400px" h="full">
                {isLoading ? (
                  <Spinner />
                ) : (
                  <EmailList
                    emails={emails}
                    selectedEmailId={selectedEmail?.id}
                    onEmailSelect={handleEmailSelect}
                  />
                )}
              </Box>
              <Box flex="1" h="full">
                {selectedEmail && (
                  <EmailDetail email={selectedEmail} />
                )}
              </Box>
            </HStack>
          )}
        </VStack>
      </Box>

      <ComposeEmail
        isOpen={isComposeOpen}
        onClose={onComposeClose}
        onSend={handleSendEmail}
      />
    </Layout>
  )
} 