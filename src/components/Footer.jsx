import { motion } from "framer-motion";
import { Mail, MessageCircle, Globe2 } from "lucide-react";
import LogoImg from "../assets/logo omega-2022.png";

export default function Footer() {
  return (
    <footer className="relative bg-white text-blue-900 py-12 px-6 overflow-hidden border-t border-blue-900">
      <div className="container lg:w-3/4 mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12 items-start text-center md:text-left">
        {/* Contact Info with Logo above */}
        <div>
          <div className="flex flex-col items-center md:items-start mb-5">
            <div className="flex items-center justify-center md:justify-start gap-3 cursor-pointer select-none">
              <img
                src={LogoImg}
                alt="Omega Engineering Industries Logo"
                className="h-12 w-auto object-contain drop-shadow-lg"
              />
            </div>
          </div>
          
          <h3 className="text-lg font-semibold text-blue-900 mb-5">Contact Us</h3>
          <ul className="space-y-4 text-sm text-blue-800">
            {/* Phone with WhatsApp image instead of phone icon */}
            <li className="flex justify-center md:justify-start gap-3">
              <div className="pt-1">
                {/* WhatsApp image instead of Phone icon */}
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  alt="WhatsApp"
                  className="w-5 h-5 object-contain"
                />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-medium text-blue-800">Whatsapp:</span>
                <span>+962 777970321</span>
                <span>+962 798878411</span>
              </div>
            </li>                       
          </ul>
        </div>

        {/* Empty column to maintain layout */}
        <div></div>

        {/* Socials + Copyright */}
        <div className="flex flex-col items-center md:items-start justify-between text-sm text-blue-800">
          {/* Website + Email + WhatsApp icon */}
          <div className="flex justify-center md:justify-start gap-4 mb-5">
            {/* Website */}
            <motion.a
              href="https://www.omega-jordan.com/"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.15 }}
              className="p-2 rounded-full border border-second-color text-second-color hover:border-main-color hover:text-main-color transition-all duration-300"
            >
              <Globe2 size={18} />
            </motion.a>

            {/* Email */}
            <motion.a
              href="mailto:omega.jo@gmail.com"
              whileHover={{ scale: 1.15 }}
              className="p-2 rounded-full border border-second-color text-second-color hover:border-main-color hover:text-main-color transition-all duration-300"
            >
              <Mail size={18} />
            </motion.a>

            {/* WhatsApp icon - using Phone icon instead of WhatsApp image */}
            <motion.a
              href="https://api.whatsapp.com/send?phone=962790603862"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.15 }}
              className="p-2 rounded-full border border-second-color text-second-color hover:border-main-color hover:text-main-color transition-all duration-300"
            >
              <MessageCircle size={18} />
            </motion.a>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="mb-1 font-semibold">
              © Copyright Omega Engineering Industries
            </p>
            <p>{new Date().getFullYear()} All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}