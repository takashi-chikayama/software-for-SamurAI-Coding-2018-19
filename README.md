# Software for IPSJ International AI Programming Contest: SamurAI Coding 2018-2019

## Documents

The rules of the game SamurAI Jockey 2018 competed in the contest are found in the following files.

* [documents/rule-en.html](documents/rule-en.html)
* [documents/rule-jp.html](documents/rule-jp.html)

## Getting Started
### Prerequisites

* C++ development environment (compiler and standard libraries for c++11 or later)
* Boost library (1.65.1 or later)
* Web browser

A web browser is used to view the documents and also show replays of races.  Replay has been tested on the following systems.

* Ubuntu: Chrome, Chromium, Firefox, Opera
* Windows 10: Chrome, Edge, Firefox
* MacOS: Safari, Firefox

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
View the log of a sample race [samples/sample.racelog](samples/racelog) by clicking the `Load` button in the page.
The manual for the viewer can be visited by clicking the `Help` button.

### Testing the Game Management System and the Sample Player

Issue the following in the top-level directory.
```
$ official/official samples/sample.crs player/greedy Mary player/greedy John >/tmp/test.racelog
```
This will run a sample race and its log will be output to /tmp/test.racelog.
You can view the race log visiting this output from the viewer.

## Authors

* **Takashi Chikayama** - *Initial version*

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Acknowledgments

Members of the Programming Contest Committee of Information Processing Society of Japan and SamurAI Coding Game Design and Development Support team helped testing the system, whose names are listed below.

* Committee Members: 
Tasuku Hiraishi (Director), Hironori Washizaki (Executive Advisor), Takashi Chikayama, Shingo Takada, Kazunori Sakamoto, Tetsuro Tanaka, Makoto Miwa, Kiyokuni Kawachiya, Tsutomu Terada, Noriko Fukasawa, Hiroshi Suzuki, Daisuke Yokoyama, Yuki Kobayashi
* Game Design and Development Suppor Team Members: Shingo Ohtsuka, Kento Kawakami, Yuki Kondou

