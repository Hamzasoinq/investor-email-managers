import {
  Box,
  Text,
  VStack,
  HStack,
  Badge,
  useColorModeValue
} from '@chakra-ui/react'
import { format, isValid, parseISO } from 'date-fns'
import { PiplEmail } from '../lib/api'

interface EmailListProps {
  emails: PiplEmail[]
  selectedEmailId?: string
  onEmailSelect: (email: PiplEmail) => void
}

const formatDate = (dateString?: string | null): string => {
  if (!dateString) return ''
  try {
    const date = parseISO(dateString)
    if (!isValid(date)) return ''
    return format(date, 'MMM dd')
  } catch {
    return ''
  }
}

export default function EmailList({ emails, selectedEmailId, onEmailSelect }: EmailListProps) {
  const bgColor = useColorModeValue('white', 'gray.800')
  const selectedBgColor = useColorModeValue('blue.50', 'blue.900')
  const borderColor = useColorModeValue('gray.200', 'gray.700')
  const mutedColor = useColorModeValue('gray.600', 'gray.400')

  return (
    <VStack 
      align="stretch" 
      spacing={0} 
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      bg={bgColor}
      h="full"
    >
      {emails.map((email) => (
        <Box
          key={email.id}
          p={2.5}
          cursor="pointer"
          borderBottomWidth="1px"
          borderColor={borderColor}
          bg={selectedEmailId === email.id ? selectedBgColor : bgColor}
          _hover={{ bg: selectedBgColor }}
          onClick={() => onEmailSelect(email)}
        >
          <HStack spacing={3} align="flex-start">
            <Box flex="1" overflow="hidden">
              <Text fontSize="sm" mb={0.5} noOfLines={1}>
                {email.from_address_json[0]?.name || email.from_address_email}
              </Text>
              <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                {email.subject}
              </Text>
              <Text fontSize="sm" color={mutedColor} noOfLines={1}>
                {email.content_preview}
              </Text>
            </Box>
            <VStack align="flex-end" spacing={1} minW="fit-content">
              <Text fontSize="xs" color={mutedColor}>
                {formatDate(email.timestamp_created)}
              </Text>
              {email.label && (
                <Badge size="sm" fontSize="xs" colorScheme="blue">
                  {email.label.replace(/_/g, ' ')}
                </Badge>
              )}
            </VStack>
          </HStack>
        </Box>
      ))}
    </VStack>
  )
}
 