export const metadata = { title: "UK Power Daily" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{fontFamily:"sans-serif", padding:20}}>
        <h1><a href="/">UK Power Daily</a></h1>
        {children}
      </body>
    </html>
  );
}
