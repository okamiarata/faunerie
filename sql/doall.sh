#!/bin/bash
PATH=/opt/homebrew/Cellar/postgresql@16/16.2_1/bin:$PATH
brew services start postgresql@16
rm -f $HOME/.db.pgdump
wget $1 -O $HOME/.db.pgdump
dropdb --if-exists derpibooru
#sudo -u postgres dropdb --if-exists derpibooru
createdb derpibooru
#sudo -u postgres createdb derpibooru
pg_restore -v -O -d derpibooru $HOME/.db.pgdump
#sudo -u postgres pg_restore -v -O -d derpibooru $HOME/.db.pgdump
python3 main.py
#sudo -u postgres bash -c "cd $PATH && python3 main.py"
brew services stop postgresql@16
rm -f $HOME/.db.pgdump
