"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteHeader() {
	const pathname = usePathname();
	const isHome = pathname === "/";
	if (isHome) return null;
	return (
		<header className="py-6 border-b border-brand-border">
			<div className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
				<nav>
					<Link
						href="/"
						className="text-3xl font-serif font-bold text-brand-primary"
					>
						dishola
					</Link>
				</nav>
			</div>
		</header>
	);
}
