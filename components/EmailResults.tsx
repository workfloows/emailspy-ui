'use client';

import * as React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronDown, ChevronUp, Copy, ArrowUp, ArrowDown } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Email {
  email: string;
  websites: string[];
}

interface ResultsProps {
  results: {
    status: string;
    domain: string;
    emails?: Email[];
    timestamp: string;
  } | null;
  error: string | null;
}

export default function EmailResults({ results, error }: ResultsProps) {
  const [displayCount, setDisplayCount] = useState(5)
  const [sortedEmails, setSortedEmails] = useState(results?.emails || [])
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [sortBy, setSortBy] = useState<'email' | 'sources'>('email')
  const totalResults = results?.emails?.length || 0

  useEffect(() => {
    if (results && results.emails) {
      const sorted = [...results.emails].sort((a, b) => {
        if (sortBy === 'email') {
          return sortOrder === 'asc'
            ? a.email.localeCompare(b.email)
            : b.email.localeCompare(a.email)
        } else {
          return sortOrder === 'asc'
            ? a.websites.length - b.websites.length
            : b.websites.length - a.websites.length
        }
      })
      setSortedEmails(sorted)
      setDisplayCount(5) // Reset display count on new results
    }
  }, [results, sortOrder, sortBy])

  const handleSort = (by: 'email' | 'sources', order: 'asc' | 'desc') => {
    setSortBy(by)
    setSortOrder(order)
  }

  const handleLoadMore = () => {
    setDisplayCount(prevCount => Math.min(prevCount + 5, sortedEmails.length))
  }

  if (error || (results && results.status === "error")) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-500">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            An error occurred while fetching email addresses 😕
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {error || "Please try again later or search for a different domain."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!results || !results.emails || results.emails.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>No Results</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg">
            No email addresses found for {results?.domain || "the given domain"} 😕
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Try searching for a different domain.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">
          🔎 Results for {results.domain}
        </h2>
      </div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          {totalResults} {totalResults === 1 ? 'result' : 'results'}
        </p>
        <div className="flex space-x-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Email {sortBy === 'email' && (sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort('email', 'asc')}>
                <ArrowUp className="mr-2 h-4 w-4" /> A to Z
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('email', 'desc')}>
                <ArrowDown className="mr-2 h-4 w-4" /> Z to A
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                Sources {sortBy === 'sources' && (sortOrder === 'asc' ? <ArrowUp className="ml-2 h-4 w-4" /> : <ArrowDown className="ml-2 h-4 w-4" />)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleSort('sources', 'asc')}>
                <ArrowUp className="mr-2 h-4 w-4" /> Least to Most
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSort('sources', 'desc')}>
                <ArrowDown className="mr-2 h-4 w-4" /> Most to Least
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="space-y-4">
        {sortedEmails.slice(0, displayCount).map((item, index) => (
          <EmailCard key={index} email={item} index={index} />
        ))}
      </div>
      {displayCount < sortedEmails.length && (
        <div className="mt-4 text-center">
          <Button onClick={handleLoadMore}>Load more</Button>
        </div>
      )}
    </div>
  );
}

function EmailCard({ email, index }: { email: Email; index: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const sourceCount = email.websites.length
  const { toast } = useToast()

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const truncateEmail = (email: string) => {
    const maxLength = isMobile ? 25 : 45
    return email.length > maxLength ? email.slice(0, maxLength) + '...' : email
  }

  const copyToClipboard = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(email.email)
      toast({
        title: "✅ Copied to clipboard",
        description: "Email address has been copied to clipboard.",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "❌ Failed to copy",
        description: "Unable to copy email to clipboard.",
      })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 * index }}
    >
      <Card className="w-full cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <CardHeader className="flex flex-row items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full">
            <CardTitle className="mb-2 sm:mb-0">{truncateEmail(email.email)}</CardTitle>
            <Badge variant="secondary" className="w-fit mt-2 sm:mt-0 sm:ml-auto">
              {sourceCount} {sourceCount === 1 ? "source" : "sources"}
            </Badge>
          </div>
          <div className="mt-1 sm:mt-0 ml-2">
            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </CardHeader>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent>
                <div className="flex items-center space-x-2 mb-4">
                  <Input
                    value={email.email}
                    readOnly
                    className="flex-grow"
                    onFocus={(e) => e.target.select()}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={copyToClipboard}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <ol className="list-decimal pl-5">
                  {email.websites.map((website, idx) => (
                    <li key={idx}>{website}</li>
                  ))}
                </ol>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}