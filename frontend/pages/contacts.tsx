import { useState, useEffect } from 'react'
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Input,
  Select,
  HStack,
  VStack,
  Flex,
  Text,
  useToast,
  Spinner,
  Badge,
  IconButton,
  Tooltip,
  FormControl,
  FormLabel,
  Button
} from '@chakra-ui/react'
import { ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon, EmailIcon, PhoneIcon } from '@chakra-ui/icons'
import { useQuery } from '@tanstack/react-query'
import Layout from '../components/Layout'
import api, { Lead, LeadsResponse } from '../lib/api'

const statusColors: Record<string, string> = {
  SKIPPED: 'gray',
  COMPLETED: 'green',
  PENDING: 'yellow',
  NOT_CONTACTED: 'blue',
  CONTACTED: 'teal',
  BOUNCED: 'red',
  REPLIED: 'green',
  UNSUBSCRIBED: 'purple',
  RESCHEDULED: 'orange'
}

export default function Contacts() {
  const toast = useToast()
  const [filters, setFilters] = useState({
    campaign_id: '',
    status: '',
    label: '',
    email: '',
    first_name: '',
    last_name: '',
  })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [sort, setSort] = useState('_id')
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc')
  
  // Fetch campaigns for dropdown
  const campaignsQuery = useQuery({
    queryKey: ['campaigns'],
    queryFn: api.campaigns.list,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  })

  // Handle campaign query errors
  useEffect(() => {
    if (campaignsQuery.error) {
      toast({
        title: 'Error loading campaigns',
        description: campaignsQuery.error instanceof Error ? campaignsQuery.error.message : 'Failed to load campaigns',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [campaignsQuery.error, toast])

  // Fetch contacts
  const contactsQuery = useQuery<LeadsResponse>({
    queryKey: ['contacts', filters, page, limit, sort, direction],
    queryFn: () => api.contacts.list({
      ...filters,
      page,
      limit,
      sort,
      direction
    }),
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: 1
  })

  // Handle contacts query errors
  useEffect(() => {
    if (contactsQuery.error) {
      toast({
        title: 'Error loading contacts',
        description: contactsQuery.error instanceof Error ? contactsQuery.error.message : 'An error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }, [contactsQuery.error, toast])

  // Handle filter change
  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
    setPage(1) // Reset to first page when filters change
  }

  // Handle sort change
  const handleSortChange = (field: string) => {
    if (sort === field) {
      setDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(field)
      setDirection('asc')
    }
  }

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      return date.toLocaleString()
    } catch {
      return '-'
    }
  }

  // Calculate pagination details
  const data = contactsQuery.data
  const totalPages = data?.total ? Math.ceil(data.total / limit) : 0
  const showingFrom = data?.data?.length ? (page - 1) * limit + 1 : 0
  const showingTo = data?.data?.length ? showingFrom + data.data.length - 1 : 0
  const totalItems = data?.total || 0
  
  return (
    <Layout>
      <Box py={4} px={6} h="100vh" maxH="100vh" overflow="hidden">
        <VStack spacing={4} h="full" align="stretch">
          <Flex justify="space-between" align="center">
            <Heading size="lg">Contacts</Heading>
          </Flex>

          {/* Filters */}
          <HStack spacing={4} flexWrap="wrap">
            <FormControl w="200px">
              <FormLabel fontSize="sm">Campaign</FormLabel>
              <Select
                size="sm"
                value={filters.campaign_id}
                onChange={(e) => handleFilterChange('campaign_id', e.target.value)}
                placeholder="All Campaigns"
                isDisabled={campaignsQuery.isLoading}
              >
                {campaignsQuery.data?.map((campaign: { id: string; name: string }) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </Select>
            </FormControl>
            
            <FormControl w="150px">
              <FormLabel fontSize="sm">Status</FormLabel>
              <Select
                size="sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                placeholder="All Statuses"
              >
                <option value="SKIPPED">Skipped</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending</option>
                <option value="NOT_CONTACTED">Not Contacted</option>
                <option value="CONTACTED">Contacted</option>
                <option value="BOUNCED">Bounced</option>
                <option value="REPLIED">Replied</option>
                <option value="UNSUBSCRIBED">Unsubscribed</option>
                <option value="RESCHEDULED">Rescheduled</option>
              </Select>
            </FormControl>
            
            <FormControl w="150px">
              <FormLabel fontSize="sm">Email</FormLabel>
              <Input
                size="sm"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                placeholder="Search email"
              />
            </FormControl>
            
            <FormControl w="150px">
              <FormLabel fontSize="sm">First Name</FormLabel>
              <Input
                size="sm"
                value={filters.first_name}
                onChange={(e) => handleFilterChange('first_name', e.target.value)}
                placeholder="First name"
              />
            </FormControl>
            
            <FormControl w="150px">
              <FormLabel fontSize="sm">Last Name</FormLabel>
              <Input
                size="sm"
                value={filters.last_name}
                onChange={(e) => handleFilterChange('last_name', e.target.value)}
                placeholder="Last name"
              />
            </FormControl>
          </HStack>

          {/* Contacts Table */}
          <Box flex="1" overflow="auto" borderWidth="1px" borderRadius="lg">
            {contactsQuery.isLoading ? (
              <Flex justify="center" align="center" h="100%">
                <Spinner />
              </Flex>
            ) : contactsQuery.error ? (
              <Flex justify="center" align="center" h="100%" direction="column" gap={4}>
                <Text>Failed to load contacts. Please try again.</Text>
                <Button colorScheme="blue" onClick={() => contactsQuery.refetch()}>Retry</Button>
              </Flex>
            ) : !data?.data || data.data.length === 0 ? (
              <Flex justify="center" align="center" h="100%">
                <Text>No contacts found with the selected filters.</Text>
              </Flex>
            ) : (
              <Table variant="simple" size="sm">
                <Thead position="sticky" top={0} bg="white" zIndex={1}>
                  <Tr>
                    <Th cursor="pointer" onClick={() => handleSortChange('first_name')}>
                      Name {sort === 'first_name' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSortChange('email')}>
                      Email {sort === 'email' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSortChange('company_name')}>
                      Company {sort === 'company_name' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSortChange('job_title')}>
                      Job Title {sort === 'job_title' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSortChange('status')}>
                      Status {sort === 'status' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th cursor="pointer" onClick={() => handleSortChange('last_sent_at')}>
                      Last Contact {sort === 'last_sent_at' && (direction === 'asc' ? '↑' : '↓')}
                    </Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.data.map((contact: Lead) => (
                    <Tr key={contact._id}>
                      <Td>
                        {contact.first_name || ''} {contact.last_name || ''}
                      </Td>
                      <Td>
                        <Text>{contact.email || ''}</Text>
                      </Td>
                      <Td>
                        {contact.company_name ? (
                          <Text>{contact.company_name}</Text>
                        ) : (
                          <Text color="gray.400">-</Text>
                        )}
                      </Td>
                      <Td>{contact.job_title || '-'}</Td>
                      <Td>
                        {contact.status ? (
                          <Badge colorScheme={statusColors[contact.status] || 'gray'}>
                            {contact.status}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </Td>
                      <Td>{formatDate(contact.last_sent_at)}</Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="Send Email">
                            <IconButton
                              aria-label="Send Email"
                              icon={<EmailIcon />}
                              size="sm"
                              colorScheme="blue"
                              onClick={() => {
                                window.location.href = `/inbox?to=${encodeURIComponent(contact.email)}`
                              }}
                            />
                          </Tooltip>
                          {contact.linkedin_person_url && (
                            <Tooltip label="LinkedIn Profile">
                              <IconButton
                                as="a"
                                aria-label="LinkedIn Profile"
                                icon={<ExternalLinkIcon />}
                                size="sm"
                                colorScheme="linkedin"
                                href={contact.linkedin_person_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              />
                            </Tooltip>
                          )}
                          {contact.phone_number && (
                            <Tooltip label={`Call: ${contact.phone_number}`}>
                              <IconButton
                                aria-label="Phone"
                                icon={<PhoneIcon />}
                                size="sm"
                                colorScheme="green"
                                as="a"
                                href={`tel:${contact.phone_number}`}
                              />
                            </Tooltip>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>

          {/* Pagination Controls */}
          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <Text>Rows per page:</Text>
              <Select 
                size="sm" 
                width="70px" 
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1) // Reset to first page when changing limit
                }}
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </Select>
            </HStack>

            <HStack spacing={2}>
              <Text>{showingFrom}-{showingTo} of {totalItems}</Text>
              <IconButton
                aria-label="Previous Page"
                icon={<ChevronLeftIcon />}
                size="sm"
                variant="ghost"
                isDisabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
              />
              <IconButton
                aria-label="Next Page"
                icon={<ChevronRightIcon />}
                size="sm"
                variant="ghost"
                isDisabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              />
            </HStack>
          </Flex>
        </VStack>
      </Box>
    </Layout>
  )
} 