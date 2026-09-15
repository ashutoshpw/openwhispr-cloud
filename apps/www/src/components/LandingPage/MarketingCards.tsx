"use client";
import { motion } from "framer-motion";
import { Cloud, KeyRound, ShieldCheck, Users } from "lucide-react";

const CloudFeaturesData = [
  {
    id: 1,
    name: "Cloud Sync",
    description:
      "Your notes and transcriptions sync securely across every device where you run OpenWhispr.",
    icon: Cloud,
  },
  {
    id: 2,
    name: "Team Spaces",
    description:
      "Share notes with your team in workspaces, with roles and invitations managed in one place.",
    icon: Users,
  },
  {
    id: 3,
    name: "API & MCP Access",
    description:
      "Pipe your transcripts into scripts, automations, and AI agents through the API and MCP.",
    icon: KeyRound,
  },
  {
    id: 4,
    name: "Privacy-first Local Models",
    description:
      "Dictate with local Whisper and Parakeet models on device, and reach for cloud models only when you choose to.",
    icon: ShieldCheck,
  },
];

const SpringAnimatedFeatures = () => {
  return (
    <div className="flex flex-col justify-center items-center lg:w-[75%]">
      <div className="flex flex-col mb-12">
        <h1 className="scroll-m-20 text-3xl sm:text-xl md:text-3xl font-semibold tracking-tight lg:text-4xl text-center max-w-[700px]">
          Built for private dictation
        </h1>
        <p className="mx-auto max-w-[500px]  md:text-lg text-center mt-2 ">
          Everything the desktop app does, plus sync, sharing, and automation
        </p>
      </div>
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CloudFeaturesData.map((feature) => {
          const FeatureIcon = feature.icon;
          return (
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                type: "spring",
                bounce: 0.7,
              }}
              key={feature.id}
              className="mt-5 text-left border p-6 rounded-md dark:bg-black"
            >
              <article>
                <FeatureIcon className="mb-3 size-8 text-blue-600" />
                <div className="mb-1 text-sm font-medium ">{feature.name}</div>
                <div className="max-w-[250px] text-sm font-normal text-gray-500">
                  {feature.description}
                </div>
              </article>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SpringAnimatedFeatures;
