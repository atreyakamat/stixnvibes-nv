"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";

// Stagger container
const staggerContainer = (stagger = 0.08, delay = 0): Variants => ({
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      when: "beforeChildren",
      staggerChildren: stagger,
      delayChildren: delay,
    },
  },
});

const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

const scaleInItem: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export function Reveal({
  children,
  className,
  delay = 0,
  variant = "fade-up",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  variant?: "fade-up" | "scale" | "fade";
}) {
  const itemVariants: Variants =
    variant === "scale" ? scaleInItem : variant === "fade"
      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
      : fadeUpItem;

  return (
    <motion.div
      className={className}
      variants={itemVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerGroup({
  children,
  className,
  stagger = 0.08,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  variant = "fade-up",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "fade-up" | "scale" | "fade";
}) {
  const itemVariants: Variants =
    variant === "scale" ? scaleInItem : variant === "fade"
      ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
      : fadeUpItem;
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

export { fadeUpItem, scaleInItem, staggerContainer };
