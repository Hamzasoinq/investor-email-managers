import {
  Box,
  Text,
  useColorModeValue,
  Flex,
  VStack,
  HStack,
  Badge,
  Button,
  Textarea,
  useToast,
  FormControl,
  Input,
  Collapse,
  Divider
} from '@chakra-ui/react'
import { format, isValid, parseISO } from 'date-fns'
import { useState } from 'react'
import api from '../lib/api'

interface EmailDetailProps {
  email: {
    id: string
    message_id: string
    subject: string
    from_address_email: string
    from_address_json: Array<{ address: string; name?: string }>
    to_address_json: Array<{ address: string; name?: string }>
    cc_address_json?: Array<{ address: string; name?: string }>
    timestamp_created?: string | null
    content_preview: string
    body: {
      text?: string
      html?: string
    }
    label?: string
    campaign_id?: string
    lead_id?: string
    thread?: Array<{
      id: string
      subject: string
      from_address_email: string
      from_address_json: Array<{ address: string; name?: string }>
      to_address_json: Array<{ address: string; name?: string }>
      timestamp_created?: string | null
      body: {
        text?: string
        html?: string
      }
    }>
  }
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return ''
    return format(date, 'MMM dd, yyyy h:mm a')
  } catch {
    return ''
  }
}

const formatAddressList = (addresses: Array<{ address: string; name?: string }>) => {
  return addresses.map(addr => addr.name ? `${addr.name} <${addr.address}>` : addr.address).join(', ')
}

export default function EmailDetail({ email }: EmailDetailProps) {
  const toast = useToast()
  const [isReplying, setIsReplying] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replyData, setReplyData] = useState({
    to: email.from_address_email,
    subject: `Re: ${email.subject}`,
    body: ''
  })

  const mutedColor = useColorModeValue('gray.600', 'gray.400')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const bgColor = useColorModeValue('white', 'gray.800')
  const headerBgColor = useColorModeValue('gray.50', 'gray.700')
  const threadBgColor = useColorModeValue('gray.50', 'gray.700')

  const handleReply = async () => {
    try {
      setIsReplying(true)
      await api.emails.send({
        to: replyData.to,
        subject: replyData.subject,
        body: replyData.body,
        reply_to_id: email.id
      })
      toast({
        title: 'Reply sent successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      setShowReply(false)
      setReplyData({
        to: email.from_address_email,
        subject: `Re: ${email.subject}`,
        body: ''
      })
    } catch (error) {
      toast({
        title: 'Failed to send reply',
        description: error instanceof Error ? error.message : 'An error occurred',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsReplying(false)
    }
  }

  return (
    <Box
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      h="full"
      overflow="hidden"
      bg={bgColor}
    >
      <VStack align="stretch" spacing={0} h="full">
        {/* Email Header */}
        <Box p={4} bg={headerBgColor} borderBottomWidth="1px" borderColor={borderColor}>
          <VStack align="stretch" spacing={3}>
            <Flex justify="space-between" align="center">
              <Text fontSize="xl" fontWeight="bold" noOfLines={2}>
                {email.subject}
              </Text>
              <HStack spacing={2}>
                {email.label && (
                  <Badge colorScheme="blue" fontSize="sm">
                    {email.label.replace(/_/g, ' ')}
                  </Badge>
                )}
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => setShowReply(!showReply)}
                  leftIcon={<Text>↩</Text>}
                >
                  Reply
                </Button>
              </HStack>
            </Flex>
            
            <VStack align="stretch" spacing={2}>
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium" w="60px">From:</Text>
                <Text fontSize="sm" color={mutedColor}>
                  {formatAddressList(email.from_address_json)}
                </Text>
              </HStack>
              
              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium" w="60px">To:</Text>
                <Text fontSize="sm" color={mutedColor}>
                  {formatAddressList(email.to_address_json)}
                </Text>
              </HStack>

              {email.cc_address_json && email.cc_address_json.length > 0 && (
                <HStack spacing={2}>
                  <Text fontSize="sm" fontWeight="medium" w="60px">CC:</Text>
                  <Text fontSize="sm" color={mutedColor}>
                    {formatAddressList(email.cc_address_json)}
                  </Text>
                </HStack>
              )}

              <HStack spacing={2}>
                <Text fontSize="sm" fontWeight="medium" w="60px">Date:</Text>
                <Text fontSize="sm" color={mutedColor}>
                  {formatDate(email.timestamp_created)}
                </Text>
              </HStack>
            </VStack>
          </VStack>
        </Box>

        {/* Inline Reply Form */}
        <Collapse in={showReply}>
          <Box p={4} borderBottomWidth="1px" borderColor={borderColor}>
            <VStack spacing={3} align="stretch">
              <FormControl>
                <Input
                  size="sm"
                  value={replyData.to}
                  onChange={(e) => setReplyData({ ...replyData, to: e.target.value })}
                  placeholder="To"
                />
              </FormControl>
              <FormControl>
                <Input
                  size="sm"
                  value={replyData.subject}
                  onChange={(e) => setReplyData({ ...replyData, subject: e.target.value })}
                  placeholder="Subject"
                />
              </FormControl>
              <FormControl>
                <Textarea
                  value={replyData.body}
                  onChange={(e) => setReplyData({ ...replyData, body: e.target.value })}
                  placeholder="Type your reply here..."
                  rows={6}
                  resize="vertical"
                />
              </FormControl>
              <HStack justify="flex-end" spacing={2}>
                <Button
                  size="sm"
                  onClick={() => setShowReply(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  isLoading={isReplying}
                  onClick={handleReply}
                >
                  Send Reply
                </Button>
              </HStack>
            </VStack>
          </Box>
        </Collapse>

        {/* Email Content */}
        <Box flex="1" overflowY="auto">
          {/* Current Email */}
          <Box p={6}>
            {!email.body.html && !email.body.text ? (
              <Text fontSize="sm" color={mutedColor} fontStyle="italic">
                No content available
              </Text>
            ) : (
              <Box
                className="email-content"
                dangerouslySetInnerHTML={{
                  __html: email.body.html || email.body.text?.replace(/\n/g, '<br/>') || ''
                }}
                sx={{
                  'p': { marginBottom: '1em' },
                  'a': { color: 'blue.500', textDecoration: 'underline' },
                  'img': { maxWidth: '100%', height: 'auto' },
                  'fontSize': 'sm',
                  'lineHeight': 'tall',
                  'color': mutedColor,
                  'whiteSpace': 'pre-wrap',
                  'wordBreak': 'break-word'
                }}
              />
            )}
          </Box>

          {/* Email Thread */}
          {email.thread && email.thread.length > 0 && (
            <>
              <Divider my={4} />
              <Box p={6} bg={threadBgColor}>
                <Text fontSize="sm" fontWeight="medium" mb={4}>
                  Previous Messages
                </Text>
                <VStack align="stretch" spacing={6}>
                  {email.thread
                    .filter(threadEmail => threadEmail.id !== email.id)
                    .sort((a, b) => {
                      const dateA = a.timestamp_created ? new Date(a.timestamp_created) : new Date(0)
                      const dateB = b.timestamp_created ? new Date(b.timestamp_created) : new Date(0)
                      return dateB.getTime() - dateA.getTime()
                    })
                    .map(threadEmail => (
                      <Box key={threadEmail.id} p={4} borderWidth="1px" borderColor={borderColor} borderRadius="md" bg={bgColor}>
                        <VStack align="stretch" spacing={3}>
                          <Flex justify="space-between" align="center">
                            <Text fontSize="sm" fontWeight="medium">
                              {formatAddressList(threadEmail.from_address_json)}
                            </Text>
                            <Text fontSize="sm" color={mutedColor}>
                              {formatDate(threadEmail.timestamp_created)}
                            </Text>
                          </Flex>
                          <Box
                            className="email-content"
                            dangerouslySetInnerHTML={{
                              __html: threadEmail.body.html || threadEmail.body.text?.replace(/\n/g, '<br/>') || ''
                            }}
                            sx={{
                              'p': { marginBottom: '1em' },
                              'a': { color: 'blue.500', textDecoration: 'underline' },
                              'img': { maxWidth: '100%', height: 'auto' },
                              'fontSize': 'sm',
                              'lineHeight': 'tall',
                              'color': mutedColor,
                              'whiteSpace': 'pre-wrap',
                              'wordBreak': 'break-word'
                            }}
                          />
                        </VStack>
                      </Box>
                    ))}
                </VStack>
              </Box>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  )
} 