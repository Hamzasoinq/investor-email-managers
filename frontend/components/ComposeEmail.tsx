import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  VStack,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'

interface ComposeEmailProps {
  isOpen: boolean
  onClose: () => void
  replyToId?: string
  defaultTo?: string
  defaultSubject?: string
  defaultBody?: string
  onSend: (data: {
    to: string
    subject: string
    body: string
    replyToId?: string
  }) => Promise<void>
}

export default function ComposeEmail({
  isOpen,
  onClose,
  replyToId,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  onSend,
}: ComposeEmailProps) {
  const [to, setTo] = useState(defaultTo)
  const [subject, setSubject] = useState(defaultSubject)
  const [body, setBody] = useState(defaultBody)
  const [isSending, setIsSending] = useState(false)
  
  const toast = useToast()

  const handleSend = async () => {
    if (!to || !subject || !body) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
      return
    }

    try {
      setIsSending(true)
      await onSend({
        to,
        subject,
        body,
        replyToId,
      })
      toast({
        title: 'Email Sent',
        description: 'Your email has been sent successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true,
      })
      onClose()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send email. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {replyToId ? 'Reply to Email' : 'Compose New Email'}
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>To</FormLabel>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                disabled={!!replyToId}
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Subject</FormLabel>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter subject"
              />
            </FormControl>

            <FormControl isRequired>
              <FormLabel>Message</FormLabel>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message here..."
                minH="200px"
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="blue"
            onClick={handleSend}
            isLoading={isSending}
          >
            Send
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
} 