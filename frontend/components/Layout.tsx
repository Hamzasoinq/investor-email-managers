import { Box, Flex, VStack, Text, Icon, Button, useColorModeValue } from '@chakra-ui/react'
import { 
  InboxIcon, 
  PaperAirplaneIcon, 
  TagIcon, 
  UserGroupIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import NextLink from 'next/link'
import { useRouter } from 'next/router'
import { ComponentType } from 'react'

interface SidebarLinkProps {
  href: string
  icon: ComponentType
  children: React.ReactNode
  isActive: boolean
}

const SidebarLink = ({ href, icon, children, isActive }: SidebarLinkProps) => {
  const activeBg = useColorModeValue('gray.100', 'gray.700')
  const hoverBg = useColorModeValue('gray.50', 'gray.600')

  return (
    <NextLink href={href} passHref legacyBehavior>
      <Button
        as="a"
        variant="ghost"
        justifyContent="start"
        alignItems="center"
        fontSize="sm"
        w="full"
        bg={isActive ? activeBg : 'transparent'}
        _hover={{ bg: hoverBg }}
        leftIcon={<Icon as={icon} boxSize={5} />}
      >
        {children}
      </Button>
    </NextLink>
  )
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const bg = useColorModeValue('white', 'gray.800')
  const borderColor = useColorModeValue('gray.200', 'gray.700')

  const navItems = [
    { href: '/inbox', icon: InboxIcon, label: 'Inbox' },
    { href: '/sent', icon: PaperAirplaneIcon, label: 'Sent' },
    { href: '/contacts', icon: UserGroupIcon, label: 'Contacts' },
  ]

  return (
    <Flex h="100vh">
      {/* Sidebar */}
      <Box
        w="64"
        bg={bg}
        borderRight="1px"
        borderColor={borderColor}
        py="6"
        px="4"
      >
        <VStack spacing="4" align="stretch">
          <Text
            fontSize="lg"
            fontWeight="semibold"
            color="blue.500"
            mb="6"
          >
            Caeros
          </Text>
          
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              href={item.href}
              icon={item.icon}
              isActive={router.pathname === item.href}
            >
              {item.label}
            </SidebarLink>
          ))}
        </VStack>
      </Box>

      {/* Main Content */}
      <Box flex="1" p="6" bg={useColorModeValue('gray.50', 'gray.900')}>
        {children}
      </Box>
    </Flex>
  )
} 