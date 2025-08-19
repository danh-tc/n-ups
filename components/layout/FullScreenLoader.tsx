"use client";

import React from "react";
import "./full-screen-loader.scss";

type Props = {
  open: boolean;
  logoSrc?: string;
  logoNode?: React.ReactNode;
  text?: string;
  backdropColor?: string;
  textColor?: string;
  dotColor?: string;
};

export default function FullScreenBrandedLoader({
  open,
  logoSrc,
  logoNode,
  text = "Please wait a moment. We are currently processing your request.",
  backdropColor = "#ffffff",
  textColor = "#3a3a3a",
  dotColor = "#b8864d",
}: Props) {
  if (!open) return null;

  return (
    <div className="rethink-loader" role="status" aria-busy="true">
      <div
        className="rethink-loader__backdrop"
        style={{ background: backdropColor }}
      />
      <div className="rethink-loader__content">
        <div className="rethink-loader__stack">
          {logoNode ? (
            <div className="rethink-loader__logo">{logoNode}</div>
          ) : logoSrc ? (
            <img
              src={logoSrc}
              alt="brand"
              className="rethink-loader__logo"
              draggable={false}
            />
          ) : null}

          {text && (
            <p className="rethink-loader__text" style={{ color: textColor }}>
              {text}
            </p>
          )}

          <div className="rethink-loader__dots">
            <span
              className="rethink-loader__dot rethink-loader__dot--1"
              style={{ background: dotColor }}
            />
            <span
              className="rethink-loader__dot rethink-loader__dot--2"
              style={{ background: dotColor }}
            />
            <span
              className="rethink-loader__dot rethink-loader__dot--3"
              style={{ background: dotColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
