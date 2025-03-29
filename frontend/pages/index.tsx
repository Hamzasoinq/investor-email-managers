import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { Spinner, Center } from '@chakra-ui/react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/inbox')
  }, [router])

  return (
    <Center h="100vh">
      <Spinner size="xl" />
    </Center>
  )
} 