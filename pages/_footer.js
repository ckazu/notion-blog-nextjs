import Link from "next/link";

export default function Footer() {
  return <>
    <footer>
      <p>
        <Link href="/"><a>TOP</a></Link>
        {" "}|{" "}
        <Link href={`https://twitter.com/${process.env.NEXT_PUBLIC_TWITTER}`}><a target="_blank">Twitter</a></Link>
      </p>
      <caption>©{new Date().getFullYear()} {process.env.NEXT_PUBLIC_BLOG_TITLE}</caption>
    </footer>
  </>;
}