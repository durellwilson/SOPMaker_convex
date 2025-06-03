import { SpringValue, animated, useSpring } from '@react-spring/web';
import React from 'react';

type AnimationConfig = {
  tension: number;
  friction: number;
  precision?: number;
};

export class AnimationService {
  static defaultConfig: AnimationConfig = {
    tension: 300,
    friction: 40,
    precision: 0.01
  };

  static createSpring<T extends object>(values: T, config?: AnimationConfig) {
    return useSpring({
      ...values,
      config: {
        ...this.defaultConfig,
        ...config
      }
    });
  }

  static handleGestureTransform(
    event: React.PointerEvent<Element>,
    currentTransform: SpringValue<number>,
    baseValue: number
  ): void {
    const { pageX } = event;
    const delta = pageX - baseValue;
    currentTransform.set(delta);
  }

  static createAccessibleAnimation(values: object, config?: AnimationConfig) {
    return this.createSpring({
      ...values,
      immediate: (key: string) => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }, config);
  }

  static createVoiceInteractionAnimation(phase: 'listening' | 'processing' | 'success') {
    const phases = {
      listening: { scale: 1.1, opacity: 0.8 },
      processing: { scale: 1.3, opacity: 1 },
      success: { scale: 1, opacity: 0.6 }
    };
    return this.createSpring(phases[phase]);
  }
}