install:
	ln -s $(realpath ../../)/index.js /usr/local/bin/fancymerge
	chmod +x /usr/local/bin/fancymerge
	sed -e "s|%HOME%|$$HOME|" org.git.tools.fancymerge.plist > ~/Library/LaunchAgents/org.git.tools.fancymerge.plist
	mkdir -p ~/.fancymerge

clean:
	rm /usr/local/bin/fancymerge
	rm ~/Library/LaunchAgents/org.git.tools.fancymerge.plist
