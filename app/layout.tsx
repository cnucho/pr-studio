import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PR Studio | 홍보물제작소",
  description: "정책홍보 콘텐츠 제작, 영상 기획, 타겟팅 전략, YouTube 성과 학습을 통합한 PR 제작 스튜디오",
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
