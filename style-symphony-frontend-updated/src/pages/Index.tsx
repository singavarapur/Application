"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import RequestCard from "@/components/customer/RequestCard"
import Navbar from "@/components/layout/Navbar"
import type { ProjectRequest, User } from "@/types"
import { ArrowRight, CheckCircle, Star, TrendingUp, Users, Shirt, CheckCheck, Clock } from "lucide-react"
import { authService, requestService } from "@/services/api"

const Index = () => {
  const [user, setUser] = useState<User | null>(null)
  const [requests, setRequests] = useState<ProjectRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user
        const userData = await authService.getCurrentUser()
        // Ensure userData has first_name and last_name (fallback to empty string if missing)
        if (userData) {
          setUser({
            ...userData,
            first_name: userData.first_name ?? "",
            last_name: userData.last_name ?? "",
          })
        } else {
          setUser(null)
        }

        // Fetch featured requests
        const response = await requestService.getRequests({ status: "open" })
        // Get only the first 3 open requests
        const featuredRequests = response.data.slice(0, 3)

        setRequests(featuredRequests)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleLogout = async () => {
    try {
      authService.logout()
      setUser(null)
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  // Designer testimonials
  const designers = [
    {
      name: "Emma Rodriguez",
      role: "Fashion Designer",
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
      quote:
        "StyleVerse has connected me with clients who truly appreciate bespoke fashion. It's transformed my business!",
    },
    {
      name: "Marcus Chen",
      role: "Costume Designer",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80",
      quote:
        "The platform makes client communication seamless. I can focus on creating rather than administrative tasks.",
    },
    {
      name: "Aisha Johnson",
      role: "Sustainable Fashion Designer",
      image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80",
      quote: "I've found amazing clients who share my passion for sustainable fashion through StyleVerse.",
    },
    {
      name: "David Park",
      role: "Avant-Garde Designer",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80",
      quote: "StyleVerse allows me to showcase my unique aesthetic to clients who are looking for something different.",
    },
  ]

  // How it works steps
  const steps = [
    {
      icon: <Shirt className="h-12 w-12 text-fashion-purple" />,
      title: "Create Your Request",
      description: "Describe your dream fashion item with as much detail as possible. Add images for inspiration.",
    },
    {
      icon: <Users className="h-12 w-12 text-fashion-purple" />,
      title: "Connect with Designers",
      description: "Skilled designers will review your request and submit proposals tailored to your needs.",
    },
    {
      icon: <CheckCheck className="h-12 w-12 text-fashion-purple" />,
      title: "Choose Your Designer",
      description: "Review proposals, portfolios and prices, then select the designer who best matches your vision.",
    },
    {
      icon: <Clock className="h-12 w-12 text-fashion-purple" />,
      title: "Track Progress",
      description: "Follow your item's journey from design to completion with regular updates from your designer.",
    },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        user={
          user
            ? {
                ...user,
                first_name: user.first_name ?? "",
                last_name: user.last_name ?? "",
                role:
                  user.role.charAt(0).toUpperCase() +
                  user.role.slice(1).toLowerCase(),
              }
            : null
        }
        onLogout={handleLogout}
      />

      {/* Enhanced Hero Section with gradient background and fashion model image */}
      <section className="bg-gradient-to-r from-fashion-purple-light to-white py-20">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-block bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full">
                <span className="text-fashion-purple font-medium flex items-center">
                  <Star className="h-4 w-4 mr-1" /> Personalized Fashion
                  Experience
                </span>
              </div>
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-fashion-purple leading-tight">
                Your Dream Fashion,
                <br />
                Designed Just For{" "}
                <span className="relative inline-block">
                  <span className="relative z-10">You</span>
                  <span className="absolute bottom-0 left-0 w-full h-3 bg-fashion-purple/20 -rotate-1"></span>
                </span>
              </h1>
              <p className="text-xl text-gray-700 max-w-lg">
                Connect with talented designers worldwide to create unique,
                personalized fashion items that reflect your style and vision.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                {!user ? (
                  <Link to="/auth">
                    <Button
                      size="lg"
                      className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-lg shadow-fashion-purple/30 transition-all hover:translate-y-[-2px] flex items-center"
                    >
                      Get Started <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : user.role === "customer" ? (
                  <Link to="/new-request">
                    <Button
                      size="lg"
                      className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-lg shadow-fashion-purple/30 transition-all hover:translate-y-[-2px] flex items-center"
                    >
                      Create Request <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Link to="/marketplace">
                    <Button
                      size="lg"
                      className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-lg shadow-fashion-purple/30 transition-all hover:translate-y-[-2px] flex items-center"
                    >
                      Browse Requests <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                )}
                <Link to="/auth">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-2 hover:bg-gray-50"
                  >
                    Learn More
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-fashion-purple-light rounded-full opacity-60"></div>
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-fashion-purple-light rounded-full opacity-60"></div>
              <div className="relative z-10 rounded-lg overflow-hidden shadow-2xl transform rotate-1">
                <img
                  src="https://images.unsplash.com/photo-1549062573-edc78a53ffa6?auto=format&fit=crop&w=600&q=80"
                  alt="Fashion Model"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="text-center mb-16">
            <span className="bg-fashion-purple/10 text-fashion-purple px-4 py-2 rounded-full font-medium">
              Process
            </span>
            <h2 className="text-4xl font-serif mt-4 text-fashion-purple">
              How StyleVerse Works
            </h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Our simple process connects you with talented designers to bring
              your fashion ideas to life.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-100"
              >
                <div className="mb-4 bg-fashion-purple/10 p-4 rounded-full inline-block">
                  {step.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
                <div className="mt-4 flex items-center text-fashion-purple">
                  <span className="font-bold text-2xl">{index + 1}</span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="ml-2 h-5 w-5" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Requests Section with enhanced styling */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="text-center mb-12">
            <span className="bg-fashion-purple/10 text-fashion-purple px-4 py-2 rounded-full font-medium">
              Discover
            </span>
            <h2 className="text-4xl font-serif mt-4 text-fashion-purple">
              Featured Requests
            </h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Browse through the latest fashion requests from our community and
              find your next design challenge.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="w-16 h-16 border-4 border-fashion-purple/30 border-t-fashion-purple rounded-full animate-spin"></div>
            </div>
          ) : requests.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="transform transition-all duration-300 hover:translate-y-[-8px] hover:shadow-xl"
                >
                  <RequestCard request={request} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-12 border border-dashed border-gray-300 rounded-lg bg-white">
              <p className="text-gray-500 text-lg">
                No featured requests at the moment.
              </p>
              <p className="text-gray-400 mt-2">Be the first to create one!</p>
            </div>
          )}

          <div className="text-center mt-12">
            {user?.role === "designer" ? (
              <Link to="/marketplace">
                <Button className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-md px-8">
                  View All Requests
                </Button>
              </Link>
            ) : user?.role === "customer" ? (
              <Link to="/new-request">
                <Button className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-md px-8">
                  Create New Request
                </Button>
              </Link>
            ) : (
              <Link to="/auth">
                <Button className="bg-fashion-purple hover:bg-fashion-purple-dark shadow-md px-8">
                  Sign Up to Continue
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Meet Our Designers */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="text-center mb-12">
            <span className="bg-fashion-purple/10 text-fashion-purple px-4 py-2 rounded-full font-medium">
              Our Community
            </span>
            <h2 className="text-4xl font-serif mt-4 text-fashion-purple">
              Meet Our Talented Designers
            </h2>
            <p className="text-gray-600 mt-2 max-w-lg mx-auto">
              Our platform connects you with skilled designers from around the
              world.
            </p>
          </div>

          <div className="mt-16 relative">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full px-4"
            >
              <CarouselContent>
                {designers.map((designer, index) => (
                  <CarouselItem
                    key={index}
                    className="md:basis-1/2 lg:basis-1/3 pl-4"
                  >
                    <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                      <CardHeader className="pb-0">
                        <div className="flex items-center space-x-4">
                          <img
                            src={designer.image || "/placeholder.svg"}
                            alt={designer.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-fashion-purple"
                          />
                          <div>
                            <CardTitle>{designer.name}</CardTitle>
                            <CardDescription>{designer.role}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <p className="text-gray-700 italic">
                          "{designer.quote}"
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="hidden md:flex justify-center gap-2 mt-8">
                <CarouselPrevious className="relative inset-0 translate-y-0 bg-fashion-purple text-white hover:bg-fashion-purple-dark" />
                <CarouselNext className="relative inset-0 translate-y-0 bg-fashion-purple text-white hover:bg-fashion-purple-dark" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20 bg-gradient-to-r from-fashion-purple-light to-white">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-white p-8 rounded-xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-fashion-purple/10 text-fashion-purple mb-6">
                <TrendingUp className="h-8 w-8" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800">10,000+</h3>
              <p className="text-gray-600 mt-2 text-lg">Successful Projects</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-fashion-purple/10 text-fashion-purple mb-6">
                <Users className="h-8 w-8" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800">5,000+</h3>
              <p className="text-gray-600 mt-2 text-lg">Skilled Designers</p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md transform hover:scale-105 transition-transform duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-fashion-purple/10 text-fashion-purple mb-6">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-4xl font-bold text-gray-800">99%</h3>
              <p className="text-gray-600 mt-2 text-lg">
                Customer Satisfaction
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section with better styling */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="bg-gradient-to-r from-fashion-purple to-fashion-purple-dark text-white rounded-xl overflow-hidden shadow-2xl">
            <div className="md:grid md:grid-cols-5">
              <div className="md:col-span-3 p-12">
                <h2 className="text-4xl font-serif mb-6 font-bold">
                  Ready to bring your fashion ideas to life?
                </h2>
                <p className="text-xl mb-8 text-white/90 max-w-lg">
                  Join StyleVerse today and connect with talented designers
                  around the world to create the perfect custom fashion piece.
                </p>
                <Link to="/auth">
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white text-fashion-purple hover:bg-gray-100 border-2 border-white"
                  >
                    Get Started Now
                  </Button>
                </Link>
              </div>
              <div className="md:col-span-2 bg-fashion-purple-dark relative hidden md:block">
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-12 left-6 w-24 h-24 rounded-full bg-white/30"></div>
                  <div className="absolute bottom-12 right-6 w-32 h-32 rounded-full bg-white/20"></div>
                  <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white/20"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with improved styling */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="container mx-auto px-4 max-w-screen-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="font-serif text-2xl mb-6">StyleVerse</h3>
              <p className="text-gray-300 mb-4">
                Custom fashion, designed just for you.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-fashion-purple rounded-full flex items-center justify-center hover:bg-fashion-purple-dark transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"></path>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-fashion-purple rounded-full flex items-center justify-center hover:bg-fashion-purple-dark transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84"></path>
                  </svg>
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-fashion-purple rounded-full flex items-center justify-center hover:bg-fashion-purple-dark transition-colors"
                >
                  <span className="sr-only">Pinterest</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"></path>
                  </svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-lg mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Homeme
                  </Link>
                </li>
                <li>
                  <Link
                    to="/auth"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/marketplace"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Designer Marketplace
                  </Link>
                </li>
                <li>
                  <Link
                    to="/new-request"
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Create Request
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-lg mb-4">Contact</h4>
              <p className="text-gray-300 mb-2">
                Email: contact@styleverse.com
              </p>
              <p className="text-gray-300 mb-2">Phone: (123) 456-7890</p>
              <p className="text-gray-300">
                Address: 123 Fashion Ave, Design District
              </p>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-10 pt-6 text-center text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} StyleVerse. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Index
