# Project Title

Software for IPSJ International AI Programming Contest: SamurAI Coding 2018-2019

## Getting Started

### Documents

The rules of the game SamurAI Jockey 2018 competed in the contest are in the following files.
* [English](documents/rule-en.html)
* [Japanese](documents/rule-jp.html)

### Prerequisites

* C++ development environment (compiler and libraries for c++11 or later)
* Boost library (1.65.1 or later)
* Web browser

### Installing

Issue the following in the top-level directory.
```
$ make
```
This will make the following software.
* official/official
   Game management system
* player/greedy
   Sample player AI

## Testing

### Testing the Viewer

Visit the [viewer page]( viewer/viewer.html) with your browser.
Load the log file sample/sample.racelog by clicking the "Load" button.
The manual of the viewer can be visited by clicking the "Help" button.

### Testing the Game Management System and the Sample Player

Issue the following in the top-level directory.
```
$ official/official sample/sample.crs player/greedy Mary player/greedy John >/tmp/test.racelog
```
This will run a sample race and its log will be output to /tmp/test.racelog.
You can view the race log visiting this output from the viewer.

## Authors

* **Takashi Chikayama** - *Initial version*

## License

This project is licensed under XXXXX.
See the [LICENSE.md](LICENCE.md) file for details.


