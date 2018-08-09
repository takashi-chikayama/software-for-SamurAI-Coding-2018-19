# Project Title

Software for IPSJ International AI Programming Contest: SamurAI Coding 2018-2019

## Getting Started

### Documents

The rules of the game SamurAI Jockey 2018 competed in the contest are in the following files.
* [documents/rule-en.html](documents/rule-en.html)
* [documents/rule-jp.html](documents/rule-jp.html)

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

Visit the viewer page [viewer/viewer.html](viewer/viewer.html) with a web browser.
View the log of a sample race [samples/sample.racelog](samples/racelog) by clicking the "Load" button in the page.
The manual for the viewer can be visited by clicking the "Help" button.

### Testing the Game Management System and the Sample Player

Issue the following in the top-level directory.
```
$ official/official samples/sample.crs player/greedy Mary player/greedy John >/tmp/test.racelog
```
This will run a sample race and its log will be output to /tmp/test.racelog.
You can view the race log visiting this output from the viewer.

## Authors

* **Takashi Chikayama** - *Initial version*


