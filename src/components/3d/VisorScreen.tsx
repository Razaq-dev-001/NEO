import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useRobotStore } from '../../state/robotStore';

export const VisorScreen: React.FC<{
  textureRef: React.MutableRefObject<THREE.CanvasTexture | null>;
}> = ({ textureRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const eyeExpression = useRobotStore((s) => s.eyeExpression);
  const isBlinking = useRobotStore((s) => s.isBlinking);
  const speechAmplitude = useRobotStore((s) => s.speechAmplitude);
  const animationState = useRobotStore((s) => s.animationState);
  const audioFreq = useRobotStore((s) => s.audioFrequencyData);

  // Micro eye wandering (saccades)
  const eyeOffsetRef = useRef({ x: 0, y: 0 });
  const blinkScaleRef = useRef(1);

  // Initialize offscreen canvas once in memory (zero DOM nodes in 3D scene)
  if (!canvasRef.current && typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 280;
    canvasRef.current = c;
  }

  // Blinking timer loop
  useEffect(() => {
    let blinkTimer: any;
    const triggerRandomBlink = () => {
      useRobotStore.getState().setBlinking(true);
      setTimeout(() => {
        useRobotStore.getState().setBlinking(false);
      }, 150);

      const nextBlinkDelay = 3000 + Math.random() * 4500;
      blinkTimer = setTimeout(triggerRandomBlink, nextBlinkDelay);
    };

    blinkTimer = setTimeout(triggerRandomBlink, 3500);
    return () => clearTimeout(blinkTimer);
  }, []);

  // Eye micro saccades loop
  useEffect(() => {
    const saccadeInterval = setInterval(() => {
      if (animationState === 'idle' || animationState === 'listening') {
        eyeOffsetRef.current = {
          x: (Math.random() - 0.5) * 5,
          y: (Math.random() - 0.5) * 3,
        };
      } else {
        eyeOffsetRef.current = { x: 0, y: 0 };
      }
    }, 2200);
    return () => clearInterval(saccadeInterval);
  }, [animationState]);

  // Main canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!textureRef.current) {
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      textureRef.current = texture;
    }

    let t = 0;

    const renderVisor = () => {
      t += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      // 1. Dark glossy OLED visor screen background
      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, width, height);

      // Subtle curved specular glass reflection highlight across the top-right
      const grad = ctx.createLinearGradient(0, 0, width, height * 0.8);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
      grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.02)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. Compute dynamic blink scale
      const targetBlink = isBlinking || eyeExpression === 'closed_sleep' ? 0.05 : 1;
      blinkScaleRef.current += (targetBlink - blinkScaleRef.current) * 0.4;

      // Primary cyan neon colors matching reference image exactly
      const cyanGlow = '#00f2fe';
      const cyanCore = '#e0ffff';
      const glowBlur = 'rgba(0, 242, 254, 0.75)';

      // Left and Right Eye Centers
      const eyeSpacing = 95;
      const eyeCenterY = 118 + eyeOffsetRef.current.y;
      const leftEyeX = width / 2 - eyeSpacing + eyeOffsetRef.current.x;
      const rightEyeX = width / 2 + eyeSpacing + eyeOffsetRef.current.x;

      const drawEye = (
        x: number,
        y: number,
        isLeft: boolean,
        expr: string,
        scaleY: number
      ) => {
        ctx.save();
        ctx.translate(x, y);

        ctx.shadowColor = glowBlur;
        ctx.shadowBlur = 24;

        if (expr === 'closed_sleep') {
          // Sleeping slit
          ctx.strokeStyle = cyanGlow;
          ctx.lineWidth = 9;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0.2, Math.PI - 0.2, false);
          ctx.stroke();
        } else if (expr === 'heart') {
          // Heart eyes
          ctx.fillStyle = '#ff2a6d';
          ctx.shadowColor = 'rgba(255, 42, 109, 0.9)';
          ctx.beginPath();
          ctx.scale(1.3, 1.3 * scaleY);
          ctx.moveTo(0, 8);
          ctx.bezierCurveTo(-18, -18, -36, 6, 0, 30);
          ctx.bezierCurveTo(36, 6, 18, -18, 0, 8);
          ctx.fill();
        } else if (expr === 'confused_asym') {
          // Asymmetric inquisitive eyes
          const modScale = isLeft ? 1.25 : 0.65;
          const offsetY = isLeft ? -10 : 8;
          ctx.strokeStyle = cyanGlow;
          ctx.lineWidth = 12 * modScale;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, offsetY, 30 * modScale, Math.PI + 0.35, Math.PI * 2 - 0.35, false);
          ctx.stroke();

          ctx.strokeStyle = cyanCore;
          ctx.lineWidth = 5 * modScale;
          ctx.beginPath();
          ctx.arc(0, offsetY, 30 * modScale, Math.PI + 0.5, Math.PI * 2 - 0.5, false);
          ctx.stroke();
        } else if (expr === 'thinking_dart') {
          // Thinking glance darting up-right
          ctx.strokeStyle = cyanGlow;
          ctx.lineWidth = 11;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(8, -12, 28, Math.PI + 0.2, Math.PI * 2 - 0.5, false);
          ctx.stroke();

          ctx.strokeStyle = cyanCore;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(8, -12, 28, Math.PI + 0.4, Math.PI * 2 - 0.7, false);
          ctx.stroke();
        } else if (expr === 'sad_droop') {
          // Sad drooped eyes
          const rot = isLeft ? -0.3 : 0.3;
          ctx.rotate(rot);
          ctx.strokeStyle = cyanGlow;
          ctx.lineWidth = 10;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 10, 30 * scaleY, 0.3, Math.PI - 0.3, false);
          ctx.stroke();
        } else {
          // EXACT REFERENCE IMAGE EYES: Thick, cute glowing happy crescent arcs ^ ^
          const arcRadius = 34;
          const strokeW = 13 * Math.max(0.1, scaleY);

          // Outer glowing arc
          ctx.strokeStyle = cyanGlow;
          ctx.lineWidth = strokeW;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(0, 8, arcRadius, Math.PI + 0.35, Math.PI * 2 - 0.35, false);
          ctx.stroke();

          // Inner bright white core arc
          ctx.strokeStyle = cyanCore;
          ctx.lineWidth = strokeW * 0.45;
          ctx.beginPath();
          ctx.arc(0, 8, arcRadius, Math.PI + 0.5, Math.PI * 2 - 0.5, false);
          ctx.stroke();
        }

        ctx.restore();
      };

      // Draw both eyes
      drawEye(leftEyeX, eyeCenterY, true, eyeExpression, blinkScaleRef.current);
      drawEye(rightEyeX, eyeCenterY, false, eyeExpression, blinkScaleRef.current);

      // 3. EXACT REFERENCE IMAGE MOUTH: Cute rounded smile wedge in center
      const mouthY = 138;
      const mouthCenterX = width / 2;

      ctx.save();
      ctx.shadowColor = glowBlur;
      ctx.shadowBlur = 18;

      if (speechAmplitude > 0.1) {
        // Active speaking waveform / pulsing mouth
        const speakMod = Math.min(1.8, Math.max(0.6, speechAmplitude * 1.5));
        const mouthW = 28 * speakMod;
        const mouthH = 16 * speakMod;

        ctx.fillStyle = cyanGlow;
        ctx.beginPath();
        // Rounded speaking mouth wedge
        ctx.ellipse(mouthCenterX, mouthY + 4, mouthW / 2, mouthH / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = cyanCore;
        ctx.beginPath();
        ctx.ellipse(mouthCenterX, mouthY + 4, (mouthW / 2) * 0.5, (mouthH / 2) * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // EXACT REFERENCE MOUTH: Small glowing cyan rounded smile block / wedge
        const mouthW = 24;
        const mouthH = 12;

        ctx.fillStyle = cyanGlow;
        ctx.beginPath();
        // Flat top, rounded semicircular bottom
        ctx.moveTo(mouthCenterX - mouthW / 2, mouthY);
        ctx.lineTo(mouthCenterX + mouthW / 2, mouthY);
        ctx.bezierCurveTo(
          mouthCenterX + mouthW / 2,
          mouthY + mouthH,
          mouthCenterX - mouthW / 2,
          mouthY + mouthH,
          mouthCenterX - mouthW / 2,
          mouthY
        );
        ctx.closePath();
        ctx.fill();

        // Inner white-hot highlight
        ctx.fillStyle = cyanCore;
        ctx.beginPath();
        ctx.arc(mouthCenterX, mouthY + 4, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Notify Three.js texture to update
      if (textureRef.current) {
        textureRef.current.needsUpdate = true;
      }

      animFrameRef.current = requestAnimationFrame(renderVisor);
    };

    renderVisor();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [eyeExpression, isBlinking, speechAmplitude, animationState, audioFreq]);

  // Return null so R3F never tries to interpret <canvas> as a Three.js object
  return null;
};
