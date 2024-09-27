import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CodeIcon, CopyIcon } from "@radix-ui/react-icons"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useToast } from "@/hooks/use-toast"

const CodeBlock: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const { toast } = useToast()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code)
      toast({
        title: "✅ Copied to clipboard",
        description: "Code has been copied to clipboard.",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "❌ Failed to copy",
        description: "Unable to copy code to clipboard.",
      })
    }
  }

  return (
    <div className="relative">
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.375rem',
          padding: '1rem',
        }}
      >
        {code}
      </SyntaxHighlighter>
      <Button
        variant="outline"
        size="icon"
        className="absolute top-2 right-2"
        onClick={copyToClipboard}
      >
        <CopyIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}

const ApiDocModal: React.FC = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <CodeIcon className="mr-2 h-4 w-4" /> API docs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] md:max-w-[625px] h-[90vh] p-0">
        <ScrollArea className="h-full">
          <div className="p-6">
            <DialogHeader>
              <DialogTitle>API Documentation</DialogTitle>
              <DialogDescription>
                EmailSpy’s backend consists of one API endpoint. It’s built with n8n, a low-code workflow automation tool. You can run your own instance of n8n and consume your own EmailSpy as a headless service.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-3">Endpoints</h3>
                <p className="mt-2"><code className="bg-muted p-1 rounded text-sm">POST /webhook/find-emails</code></p>
                <p className="mt-1 text-sm">Check email addresses for a given domain.</p>
              </section>

              <section>
                <h4 className="font-semibold mb-3">Request Body</h4>
                <CodeBlock
                  code={JSON.stringify({ domain: "example.com" }, null, 2)}
                  language="json"
                />
              </section>

              <section>
                <h4 className="font-semibold mb-3">Response</h4>
                <CodeBlock
                  code={JSON.stringify({
                    domain: "example.com",
                    emails: ["john@example.com", "jane@example.com"]
                  }, null, 2)}
                  language="json"
                />
              </section>

              <section>
                <h4 className="font-semibold mb-3">Code Snippet (JavaScript)</h4>
                <CodeBlock
                  code={`fetch('https://your-domain.com/webhook/find-emails', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ domain: 'example.com' })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));`}
                  language="javascript"
                />
              </section>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default ApiDocModal