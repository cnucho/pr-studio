import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 시대 홍보 전략 플랫폼",
  description: "정책홍보 콘텐츠 생성, AI 친화 글쓰기, 마이크로타겟팅, YouTube 성과 학습을 통합한 데모 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
