"use client"

import * as React from "react"
import { useEffect, useCallback } from "react"
import { v4 as uuidv4 } from 'uuid'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from "framer-motion"
import { ReloadIcon, NotionLogoIcon } from '@radix-ui/react-icons'
import { NavigationMenu, NavigationMenuItem, NavigationMenuList } from "@/components/ui/navigation-menu"
import { Menu } from "lucide-react"
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Toaster } from "@/components/ui/toaster";
import ApiDocModal from '@/components/ApiDocModal'
import { checkEmails, getEmailCheckStatus } from '@/app/actions'
import { Progress } from "@/components/ui/progress"

const EmailResults = dynamic(() => import('@/components/EmailResults'), { ssr: false })

export default function Home() {
  const [domain, setDomain] = useState("")
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [error, setError] = useState("")
  const [waitingMessage, setWaitingMessage] = useState("")
  const [progress, setProgress] = useState(100) // Start at 100%
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const [timeoutOccurred, setTimeoutOccurred] = useState(false)
  const router = useRouter()

  const messages = [
    "AI Agents are scanning the web for public sources... 🤖",
    "Snooping around the nets… ethically! 🕵️‍♂️",
    "n8n is pulling in data from all corners of the web... 🌐",
    "Hunting down those [dot] swaps... 🧐",
    "Cross-referencing with another AI Agent 🤖",
    "Decoding those [at] tricks... 🔍",
    "Hunting emails faster than a caffeine-fueled intern! ☕",
    "Our intern is Googling really fast… 🏃‍♂️",
    "Transforming raw info into insights... ⚙️",
    "Bribing the email gnomes... 🧙‍♂️",
    "Getting close... just tying up a few loose ends! ⏳",
    "Almost there... double-checking the details! 🔄",
    "We’re juggling a lot right now, your results are coming! ⚡"
  ]

  // Update the waiting message every 4 seconds
  // Keep the last message until the results are ready or the timeout occurs
  const updateWaitingMessage = useCallback(() => {
    setWaitingMessage((prevMessage) => {
      const currentIndex = messages.indexOf(prevMessage)
      const nextIndex = currentIndex + 1
      return nextIndex < messages.length ? messages[nextIndex] : messages[messages.length - 1]
    })
  }, [])

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    if (loading) {
      setWaitingMessage(messages[0]) // Set initial message
      intervalId = setInterval(() => {
        updateWaitingMessage()
      }, 4000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [loading, updateWaitingMessage])

  useEffect(() => {
    // Check if the session_id cookie exists
    const sessionId = getCookie('session_id')
    if (!sessionId) {
      // If it doesn't exist, create a new one
      const newSessionId = uuidv4()
      setCookie('session_id', newSessionId, 7) // Set cookie for 7 days
    }
  }, [])

  // Validate domain
  const isValidDomain = (domain: string) => {
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
  }

  const handleCheck = async () => {
    if (!isValidDomain(domain)) {
      setError("Please enter a valid domain (e.g., example.com or subdomain.example.com)")
      return
    }

    setError("")
    setLoading(true)
    setProgress(100) // Reset to 100%
    setWaitingMessage(messages[0]) // Set initial message

    const timeout = setTimeout(() => {
      setLoading(false)
      setError("No results found within the time limit. Please try again.")
      setProgress(100) // Reset to 100%
      setTimeoutOccurred(true)
    }, 120000) // 120 seconds
    setTimeoutId(timeout)

    try {
      const data = await checkEmails(domain)
      if (data.error) {
        setError(data.error)
      } else if (data.callbackId) {
        pollForResults(data.callbackId)
      } else {
        setError("No callback ID received")
      }
    } catch (error) {
      console.error('Error:', error)
      setError("An error occurred while initiating the email check. Please try again.")
    }
  }

  const pollForResults = async (id: string) => {
    const pollInterval = setInterval(async () => {
      if (timeoutOccurred) {
        clearInterval(pollInterval)
        return
      }

      const status = await getEmailCheckStatus(id)
      if (status.error) {
        clearInterval(pollInterval)
        setError(status.error)
        setLoading(false)
        setProgress(100) // Reset to 100%
        if (timeoutId) clearTimeout(timeoutId)
      } else if (status.status === 'completed') {
        if (!timeoutOccurred) {
          clearInterval(pollInterval)
          setResults(status.data)
          setLoading(false)
          setProgress(100) // Reset to 100%
          if (timeoutId) clearTimeout(timeoutId)
        }
      }
      // If status is still 'pending', continue polling
    }, 2000) // Poll every 2 seconds
  }

  useEffect(() => {
    let progressInterval: NodeJS.Timeout
    if (loading) {
      progressInterval = setInterval(() => {
        setProgress(prevProgress => {
          const newProgress = prevProgress - (100 / 50) // Decrease by 100% over 180 seconds
          return newProgress < 0 ? 0 : newProgress
        })
      }, 1000) // Update every second
    }
    return () => {
      if (progressInterval) clearInterval(progressInterval)
      if (timeoutId) clearTimeout(timeoutId)
      setTimeoutOccurred(false) // Reset the timeout flag when component unmounts or dependencies change
    }
  }, [loading, timeoutId])

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDomain(e.target.value)
    setError("") // Reset error when user types
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCheck()
    }
  }

  const resetSearch = () => {
    setDomain("")
    setResults(null)
    setError("")
  }

  return (
    <div>
      <div className="min-h-screen p-4 sm:p-8 font-[family-name:var(--font-sans)] flex flex-col">
        <Toaster />
        <nav className="w-full max-w-7xl mx-auto mb-8 flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => {
              resetSearch()
              router.push('/')
            }}
          >
            <Image
              src="/images/logo.svg"
              alt="EmailSpy Logo"
              width={36}
              height={36}
              className="mr-3"
            />
            <span className="text-2xl font-bold">EmailSpy</span>
          </div>
          <div className="sm:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
          <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:block absolute sm:relative top-16 sm:top-0 left-0 right-0 bg-background sm:bg-transparent z-50 flex justify-center sm:justify-start`}>
            <NavigationMenu>
              <NavigationMenuList className="flex flex-col sm:flex-row items-center">
                <NavigationMenuItem className="mt-6 sm:mt-0 sm:mr-4 mb-4 sm:mb-0">
                  <Link href="https://30dayaisprint.notion.site/Duplicate-EmailSpy-10a5b6e0c94f8003bce4f03dd023d975" passHref target="_blank" rel="noopener noreferrer">
                    <Button>Duplicate</Button>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem className="mb-8 sm:mb-0">
                  <ApiDocModal />
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </nav>

        <main className="flex-grow flex flex-col items-center justify-center w-full max-w-3xl mx-auto">
          <motion.div
            layout
            className="w-full text-center mb-8"
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <h1 className="text-3xl font-bold mb-4">🕵️ Find Public Email Addresses Fast</h1>
            <p className="text-gray-400 mb-2">
              Enter a domain and let AI find public emails for that site
            </p>
          </motion.div>

          <motion.div
            layout
            className="w-full"
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <Card className="w-full mb-8">
              <CardHeader>
                <CardTitle>🔍 Enter domain</CardTitle>
                <CardDescription>Usually takes ~1-2 minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Input
                    placeholder="e.g. n8n.io"
                    className="w-full sm:w-auto sm:flex-1 h-12 text-lg min-h-[42px]"
                    value={domain}
                    onChange={handleDomainChange}
                    onKeyDown={handleKeyPress}
                  />
                  <Button
                    onClick={handleCheck}
                    disabled={loading}
                    className="w-full sm:w-auto h-11 text-lg min-h-[42px] font-bold"
                  >
                    {loading ? (
                      <>
                        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                        Finding...
                      </>
                    ) : (
                      'Find emails 🔎'
                    )}
                  </Button>
                </div>
                {error && (
                  <p className="text-red-500 mt-2 text-sm">{error}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <AnimatePresence>
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="w-full text-center mt-4"
              >
                <div className="flex justify-center mb-6">
                  <Progress value={progress} className="max-w-[250px] w-full" />
                </div>
                <p className="text-gray-400">{waitingMessage}</p>
              </motion.div>
            ) : results ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.5 }}
                className="w-full"
              >
                <EmailResults results={results} error={error} />
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full text-center text-gray-500"
              >
                Enter a domain and click <b>Find emails 🔎</b> to see results
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-8 flex justify-center">
            <a href="https://www.producthunt.com/posts/emailspy?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-emailspy" target="_blank" rel="noopener noreferrer">
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=492218&theme=light"
                alt="EmailSpy - Find public emails across domains, even the sneaky ones | Product Hunt"
                style={{ width: '250px', height: '54px' }}
                width="250"
                height="54"
              />
            </a>
          </div>
        </main>

        <footer className="w-full max-w-7xl mx-auto mt-8 flex flex-col items-center justify-center">
          <p className="text-sm text-gray-400 mb-2">Powered by</p>
          <div className="flex items-center space-x-4 mb-4">
            <Link href="https://workfloows.com" target="_blank">
              <Image
                src="/images/workfloows.svg"
                alt="Workfloows Logo"
                width={120}
                height={30}
              />
            </Link>
            <Link href="https://n8n.io?utm_source=30day&utm_medium=emailspy" target="_blank">
              <Image
                src="/images/n8n.svg"
                alt="n8n Logo"
                width={60}
                height={30}
              />
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="https://www.linkedin.com/in/oskarkramarz/" target="_blank" className="text-sm text-gray-400 hover:text-gray-300">
              Oskar Kramarz (Workfloows)
            </Link>
            <Link href="https://www.linkedin.com/in/maxtkacz/" target="_blank" className="text-sm text-gray-400 hover:text-gray-300">
              Max Tkacz (n8n)
            </Link>
          </div>
        </footer>
      </div>

      <section className="w-full p-4 sm:p-8 max-w-7xl mx-auto mt-8 flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4 text-center">How EmailSpy works</h1>
        <p className="text-md text-zinc-500 text-center mb-6 max-w-2xl mx-auto">
          The Next.js front-end, hosted on Vercel, sends a POST request to an n8n workflow. Inside n8n, AI Agents scrape multiple sources for public email data. n8n then handles deduplication and aggregation. The final, structured results are sent back to the front-end.
        </p>
        <div className="flex justify-center space-x-4 mb-8">
          <Link href="https://30dayaisprint.notion.site/Duplicate-EmailSpy-10a5b6e0c94f8003bce4f03dd023d975" target="_blank">
            <Button variant="default" className="font-bold">
              <NotionLogoIcon className="h-6 w-6 mr-2" />
              Duplicate EmailSpy
            </Button>
          </Link>
        </div>
        <div className="w-full max-w-4xl mx-auto">
          <div className="relative flex justify-center items-center">
            <Image
              src="/images/how-it-works.png"
              alt="How EmailSpy works"
              width={800}
              height={450}
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper functions for cookie management
function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict; ${location.protocol === 'https:' ? 'Secure;' : ''}`
}

function getCookie(name: string) {
  return document.cookie.split('; ').reduce((r, v) => {
    const parts = v.split('=')
    return parts[0] === name ? decodeURIComponent(parts[1]) : r
  }, '')
}
