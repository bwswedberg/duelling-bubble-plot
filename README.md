## Duelling Bubble Plot
This is a bubble plot that compares two subjects by a set of keywords. In the above plot, we are comparing U.S. States based on fruits and veggies.

Check it out live here: [http://bl.ocks.org/bwswedberg/dcde8e183f21a6ffc4d1](http://bl.ocks.org/bwswedberg/dcde8e183f21a6ffc4d1)


### Definitions
Before we go any deeper, here are some definitions.

* Subject: What we are comparing. Every subject is described by its keywords. two subject per plot.
* Keyword: Represented by a bubble in the plot. One or more per plot.

        
### Test Data
This is a test data set that I created to easily illustrate the plot. Although this data is random, pretend that we polled the U.S. population on their favorite organic product, and aggregated the responses by state.

* Subjects: All U.S. states w/ D.C. States are selected randomly.
* Keywords: Randomly selected fruits and veggies. Frequencies are assigned randomly from 0 to 1000.
     
   
### What does the plot show?
The plot shows the difference between two subjects based on keywords. Each keyword is sized by how significant it is within both subjects (i.e. popular keywords are larger than less popular). The bubble x value is based on the percentage used by the subject on the left side minus the percentage used by the subject on the right side. This means that words heavily used by only one subject, will be plotted closer to that subject.


#### Example
To illustrate this even further here is an example. Say we are comparing the subjects: Iowa (left side) and Ohio (right side), and lets say we want to find out which state likes apples more. Imagine that we collect a ton of twitter data and grab tweets in Iowa and Ohio that mention the word 'apple'. After collection, say that Iowa had 200 tweets that mentioned 'apple' out of 1000 tweets; Ohio had 600 tweets that mentioned 'apple' out of 700 tweets. Here is how you would find the the bubble parameters:

* bubble radius = 200+600 = 800 * some scale
* bubble x position = (200/1000 - 600/700) * some scale (the bubble will be placed very close Ohio's max)
* bubble color = a function of the bubble x position
* bubble y position = some gaussian random number generator


## Inspiration
This visualization was partly inspired by Mike Bostock et al. (below). However this one has a few nice features that will allow a user to drill-down on small differences. Mainly, users can 'kill' dominating nodes--and by doing so all other keywords will resize for easier comparison. Almost as if you eliminated that bubble/keyword. If you want to add it back--simply click the killed bubble to revive it.

Mike Bostock, Shan Carter and Matthew Ericson. *At the National Convention, the Words They Used.*
[http://www.nytimes.com/interactive/2012/09/06/us/politics/convention-word-counts.html](http://www.nytimes.com/interactive/2012/09/06/us/politics/convention-word-counts.html)


## Contact
If you have any questions please contact me at bwswedberg at gmail dot com or jkerryn at gmail dot com.
