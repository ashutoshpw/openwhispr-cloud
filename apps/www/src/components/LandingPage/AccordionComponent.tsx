import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/ui/components/accordion";

export function AccordionComponent() {
  return (
    <div className="flex flex-col w-[70%] lg:w-[50%]">
      <h1 className="scroll-m-20 pb-12 text-center text-3xl font-semibold tracking-tight lg:text-4xl">
        Frequently Asked Questions (FAQs)
      </h1>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>
            Does my dictation audio leave my device?
          </AccordionTrigger>
          <AccordionContent>
            Not necessarily. OpenWhispr runs local Whisper and Parakeet models
            on your machine, so transcription happens entirely on device. Cloud
            models are available when you want them, and the choice is always
            yours per dictation.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>
            What does OpenWhispr Cloud add over the desktop app?
          </AccordionTrigger>
          <AccordionContent>
            Cloud sync across devices, shared team workspaces, API keys for
            automation, and MCP access so AI agents can search and work with
            your notes. The desktop experience stays the same.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
