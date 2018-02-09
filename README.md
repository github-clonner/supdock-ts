# Supdock
What's Up, Dock(er)? A slightly more visual way to interact with the docker daemon. Supdock is a wrapper for the docker command meaning you can still use all of the other `docker` commands without issues.

<p align="center">
<img src="https://i.imgur.com/ATV0nP7.png" width="250">

## Why
Repetitive use of `docker ps`, `docker logs`, `docker stats` and `docker exec -ti` when troubleshooting  complex container setups can get chaotic. Supdock aims to optimize and speed up your workflow using docker.

<p align="center">
<img src="https://i.imgur.com/DVP2rbt.gif" width="450">

## Installation
##### NPM
```bash
npm install -g supdock
```

Source code for npm [supdock](https://www.npmjs.com/package/supdock) is available in the [`npm`](https://github.com/segersniels/supdock/tree/npm) branch.

##### Ruby
You might have to execute as `sudo` to install the `tty-prompt` gem.  

```bash
gem install tty-prompt ; curl -o /usr/local/bin/supdock https://raw.githubusercontent.com/segersniels/supdock/master/supdock ; chmod +x /usr/local/bin/supdock
```

### Extra
If you don't want to use `supdock` and `docker` separately you can just set an alias.

```bash
alias docker="supdock"
```

## Known Issues
### Ruby
- `... can't find header files for ruby at /usr/.../ruby.h` when building native extensions.  

You may need to install ruby headers by installing `ruby-devel` on your machine.  
*Source: [`https://stackoverflow.com/a/4502672/9002446`](https://stackoverflow.com/a/4502672/9002446)*

### NPM
- Passing flags to `supdock` (eg. `supdock rm -f foo`) when using one of the custom commands can result in an unknown option error.

This is because [`commander.js`](https://www.npmjs.com/package/commander) interferes with it and doesn't know it. These custom flags have to be added to the tool manually. So if you encounter a flag you wish to use, feel free to post an issue so I can add it.

I currently have these basic flags added:  
```bash
    -V, --version      output the version number
    -f, --force        
    -D, --debug        
    -H, --host <list>  
    -l, --log-level    
    --config           
    --no-stream        
    -h, --help         output usage information
```

## Contributing
If you would like to see something added or you want to add something yourself feel free to create an issue or a pull request.
