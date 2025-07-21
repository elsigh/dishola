import Image from "next/image"

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <h1 className="text-3xl font-bold text-brand-text mb-6">
        <strong>who</strong> is dishola?
      </h1>

      {/* Lindsey Simon */}
      <div className="flex flex-col md:flex-row gap-8 items-start bg-white rounded-lg shadow p-6">
        <div className="flex flex-col items-center md:w-1/3">
          <Image src="/img/LindseySimon.jpg" alt="Lindsey Simon" width={230} height={193} className="rounded-md mb-2" />
          <h4 className="text-lg font-semibold">Lindsey Simon</h4>
          <h5 className="mt-2 text-sm font-medium">Dishola Username:</h5>
          <a href="/users/view/elsigh" className="underline text-blue-700">
            elsigh
          </a>
          <h5 className="mt-2 text-sm font-medium">Favorite Flavor:</h5>
          <a href="/dish/index/everywhere/tag:Chinese" className="underline text-blue-700">
            Chinese
          </a>
        </div>
        <div className="flex-1 space-y-4">
          <p>
            <strong>Who Is Dishola?</strong>
          </p>
          <p>
            Why YOU, of course. It is the Dishola member that makes up the crux of what makes Dishola work. But in the
            background there are a handful of us who work to make sure Dishola works so that you can make it work. We
            are foodies, geeks, travelers, techies and creatives (yea, that explains a lot).
          </p>
          <p>
            The point of Dishola is for us all to contribute to - and benefit from - credible, precise food reviews.
            Dishola is different because it is focused. We're focused on <em>The Dish</em>. You know, <em>The Dish</em>{" "}
            you've been craving since your last visit to Chiang Mai... <em>The Dish</em> you had last Thursday and can't
            stop thinking about... <em>The Dish</em> you wish you could find when your mind is as empty as your stomach…
            and when you do find that absolutely oh-so-perfectly prepared, flawlessly satisfying dish, we call it{" "}
            <strong>The Dishola!</strong>
          </p>
          <p>
            Dishola members are passionate about their food experiences and it shows in their reviews. Plus, Dishola has
            on-staff editors who bring professional editorial content to the{" "}
            <a href="/features/dish" className="underline text-blue-700">
              Divine Dish
            </a>
            ,{" "}
            <a href="/features/users" className="underline text-blue-700">
              Celebrity Disher
            </a>{" "}
            and{" "}
            <a href="/safaris/index" className="underline text-blue-700">
              Safaris
            </a>{" "}
            pages. Our mix of dedicated, user-driven and editorial content give you the best of both worlds. We strive
            for credible, useful, practical advice that helps you get from your last dish to your next{" "}
            <strong>Dishola</strong>.
          </p>
        </div>
      </div>

      {/* Laura Kelso & Meredith Maycotte */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center bg-white rounded-lg shadow p-6">
          <Image src="/img/LauraKelso.jpg" alt="Laura Kelso" width={230} height={193} className="rounded-md mb-2" />
          <h4 className="text-lg font-semibold">Laura Kelso</h4>
          <h5 className="mt-2 text-sm font-medium">Dishola Username:</h5>
          <a href="/users/view/laura" className="underline text-blue-700">
            laura
          </a>
          <h5 className="mt-2 text-sm font-medium">Favorite Flavor:</h5>
          <a href="/dish/index/everywhere/tag:peach" className="underline text-blue-700">
            peach
          </a>
        </div>
        <div className="flex flex-col items-center bg-white rounded-lg shadow p-6">
          <Image
            src="/img/MeredithMaycotte.jpg"
            alt="Meredith Maycotte"
            width={230}
            height={193}
            className="rounded-md mb-2"
          />
          <h4 className="text-lg font-semibold">Meredith Maycotte</h4>
          <h5 className="mt-2 text-sm font-medium">Dishola Username:</h5>
          <a href="/users/view/embyorg" className="underline text-blue-700">
            embyorg
          </a>
          <h5 className="mt-2 text-sm font-medium">Favorite Flavor:</h5>
          <a href="/dish/index/everywhere/tag:raw" className="underline text-blue-700">
            raw
          </a>
        </div>
      </div>

      {/* Erwin Gosal & Paula Disbrowe */}
      <div className="grid md:grid-cols-2 gap-8">
        <div className="flex flex-col items-center bg-white rounded-lg shadow p-6">
          <Image src="/img/ErwinGosal.jpg" alt="Erwin Gosal" width={230} height={193} className="rounded-md mb-2" />
          <h4 className="text-lg font-semibold">Erwin Gosal</h4>
          <h5 className="mt-2 text-sm font-medium">Dishola Username:</h5>
          <a href="/users/view/e12win" className="underline text-blue-700">
            e12win
          </a>
          <h5 className="mt-2 text-sm font-medium">Favorite Flavor:</h5>
          <a href="/dish/index/everywhere/tag:fried" className="underline text-blue-700">
            fried
          </a>
        </div>
        <div className="flex flex-col items-center bg-white rounded-lg shadow p-6">
          <Image
            src="/img/PaulaDisbrowe.jpg"
            alt="Paula Disbrowe"
            width={230}
            height={193}
            className="rounded-md mb-2"
          />
          <h4 className="text-lg font-semibold">Paula Disbrowe</h4>
          <h5 className="mt-2 text-sm font-medium">Dishola Username:</h5>
          <a href="/users/view/paula" className="underline text-blue-700">
            paula
          </a>
          <h5 className="mt-2 text-sm font-medium">Favorite Flavor:</h5>
          <a href="/dish/index/everywhere/tag:raw" className="underline text-blue-700">
            lemon
          </a>
        </div>
      </div>
    </div>
  )
}
