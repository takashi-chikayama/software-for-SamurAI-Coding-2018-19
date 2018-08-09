subdirs := DOCUMENTS OFFICIAL PLAYER VIEWER EDITOR SAMPLES
.PHONY: all $(subdirs)
all:  $(subdirs)

OFFICIAL:
	cd official; make

PLAYER:
	cd player; make

DOCUMENTS:

VIEWER:

EDITOR:

SAMPLES:

tags:
	etags */*.hpp */*.cpp */*.js */*.html

tar: distclean
	tar zcvf ../samurai-software-`date -Iminutes` *

clean:
	rm -rf *~ */*~ \#*\#
	cd documents; make clean
	cd official; make clean
	cd player; make clean
	cd viewer; make clean
	cd editor; make clean
	cd samples; make clean

distclean:
	rm -rf *~ */*~ \#*\# TAGS
	cd documents; make distclean
	cd official; make distclean
	cd player; make distclean
	cd viewer; make distclean
	cd editor; make distclean
	cd samples; make distclean
