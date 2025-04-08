import { Menu } from 'lucide-react'
import React from 'react'

type Props = {
    setSidebarOpen:(open: boolean) => void,
    sidebarOpen : boolean
}

function Header({setSidebarOpen,sidebarOpen}: Props) {
  return ( <div className="flex justify-between items-center p-6 border-b">
    <button
  className="md:hidden  bg-[#111827] text-white p-2 rounded-md"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  <Menu size={20} />
</button>
      <h1 className="text-xl font-medium text-gray-800 ">Prepare Response</h1>
      <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
        <span className="text-white text-sm">JD</span>
      </div>
    </div>
  )
}

export default Header