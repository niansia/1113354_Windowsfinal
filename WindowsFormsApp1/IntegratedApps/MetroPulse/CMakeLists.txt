cmake_minimum_required(VERSION 3.16)
project(MetroPulseEngine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(MetroPulseEngine src/main.cpp)

if(MSVC)
  target_compile_options(MetroPulseEngine PRIVATE /W4 /O2)
else()
  target_compile_options(MetroPulseEngine PRIVATE -Wall -Wextra -pedantic -O2)
endif()
