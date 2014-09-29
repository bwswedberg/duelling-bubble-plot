/**
 * This is the duelling bubble plot. Everything except the data generator was in here. Sorry if that makes it confusing, but it should be fairly easy to break out if you choose to do so.
 * @param parentSelector {string} The css selector that will render the plot.
 * @param dGen {object} Some object that can call getData(). This param is mainly for example purpose. If you were to use this in an app this wouldn't be here. In a real app you would simple call updateDisplay and pass this the data.
 * @returns {{initDisplay: initDisplay, updateDisplay: updateDisplay}}
 */
var duellingBubblePlot = function (parentSelector, dGen) {
    var gutterBottom, nodeUtils, radiusExtents, svg,
        force, gravity, collide, getTickY, tick, nodeEvents,
        initDisplay, redraw, jitter, updateDisplay, setTitle,
        canvasWidth = 960,
        canvasHeight = 450,
        padding = 0,
        COLOR = {LEFT: '#762A83', MIDDLE: '#F7F7F7', RIGHT: '#1B7837'},
        RADIUS = {MAX: 50, MIN: 10},
        margin = {top: 5, right: 5, bottom: 5, left: 5},
        width = canvasWidth - margin.left - margin.right,
        height = canvasHeight - margin.top - margin.bottom;

    gutterBottom = {
        contentHeight: 20,
        margin: {top: 2, bottom: 2},
        total: function () {
            return gutterBottom.contentHeight + gutterBottom.margin.top + gutterBottom.margin.bottom;
        }
    };

    radiusExtents = (function () {
        var rightMin = 0,
            rightMax = 0,
            leftMin = 0,
            leftMax = 0;

        return {
            getLargestExtent: function () {
                var ex = d3.extent([rightMin, rightMax, leftMin, leftMax]);
                return ex;
            },
            setSideExtent: function (sideName, someExtent) {
                if (sideName === 'leftSide') {
                    leftMin = someExtent[0];
                    leftMax = someExtent[1];
                } else if (sideName === 'rightSide') {
                    rightMin = someExtent[0];
                    rightMax = someExtent[1];
                }
            }
        };
    }());

    /**
     * Self invoked closure to encapsulate node manipulation jazz.
     */
    nodeUtils = (function (someWidth, someHeight, someMargin, someGutterBottom) {
        var getLeftColor, getRightColor, getPsuedoRandom, opacityFunction, scaleRadiousFunction,
            scaleXFunction, getXValue, getRadiusValue;

        getLeftColor = d3.scale.linear()
            .domain([-1, 0])
            .range([COLOR.LEFT, COLOR.MIDDLE]);

        getRightColor = d3.scale.linear()
            .domain([0, 1])
            .range([COLOR.MIDDLE, COLOR.RIGHT]);

        getPsuedoRandom = d3.random.normal(someHeight / 2, 60);

        opacityFunction = d3.scale.pow().exponent(0.1)
            .domain([20, Math.sqrt(someWidth * someWidth + someHeight * someHeight)])
            .range([0.2, 0.7]);

        scaleRadiousFunction = d3.scale.linear()
            //.domain([0,1]) domain is dynamic
            .range([RADIUS.MIN, RADIUS.MAX]);

        scaleXFunction = d3.scale.linear()
            .domain([-1, 1])
            .range([0, someWidth]);

        getXValue = function (leftFreq, rightFreq, leftTotalFreq, rightTotalFreq) {
            // value from -1 to 1
            var xValue,
                percentLeft = leftFreq / leftTotalFreq,
                percentRight = rightFreq / rightTotalFreq,
                difference = percentRight - percentLeft;

            // handles 0 percent values
            if ((percentRight || percentLeft) === 0) {
                // if pctLeft is > than pctRight give it value -1 else 1
                xValue = (percentLeft > percentRight) ? -1 : 1;
                // if pctRight = pctLeft (they are both 0) make value 0 else don't change it;
                xValue = (percentLeft === percentRight) ? 0 : xValue;
            } else {
                xValue = difference / (percentRight + percentLeft);
            }
            return xValue;
        };

        getRadiusValue = function (leftFreq, rightFreq, leftTotalFreq, rightTotalFreq) {
            return (leftFreq + rightFreq) / (leftTotalFreq + rightTotalFreq);
        };

        return {
            // min and max obj to manage the extents of radius values
            // Don't alter! these get set dynamically and are used for setting the domain

            getScaledRadius: scaleRadiousFunction,

            getRadiusValue: getRadiusValue,

            getRadiusSize: function (leftFreq, rightFreq, leftTotalFreq, rightTotalFreq) {
                var value = getRadiusValue(leftFreq, rightFreq, leftTotalFreq, rightTotalFreq);
                return scaleRadiousFunction(value);
            },

            setRadiusDomain: function (objList) {
                var min, max;
                objList.forEach(function (obj) {
                    var v = (obj.leftFreq + obj.rightFreq) / (obj.leftTotalFreq + obj.rightTotalFreq);
                    max = (v > max) ? v : max;
                    min = (v < min) ? v : min;
                });
            },

            getXValue: getXValue,

            getXPos: function (leftFreq, rightFreq, leftTotalFreq, rightTotalFreq) {
                // value from -1 to 1
                var v = getXValue(leftFreq, rightFreq, leftTotalFreq, rightTotalFreq);
                return scaleXFunction(v);
            },

            getYPos: function (radius) {
                var yPos = getPsuedoRandom(),
                    centerOfDiv = someMargin.top + (someHeight - someGutterBottom.total()) / 2,
                    bottomBounds = centerOfDiv * 2 - radius;
                while (true) {
                    yPos = getPsuedoRandom();
                    // check to see if it is out of canvas
                    if ((yPos < bottomBounds) && (yPos > radius)) {
                        return yPos;
                    }
                }
            },

            getFontSize: function (radius) {
                return radius * 0.75;
            },

            getOpacity: opacityFunction,

            getColor: function (leftFreq, rightFreq, leftTotalFreq, rightTotalFreq) {
                var value = getXValue(leftFreq, rightFreq, leftTotalFreq, rightTotalFreq),
                    clr;
                if (value >= 0) {
                    clr = getRightColor(value);
                } else {
                    clr = getLeftColor(value);
                }
                return clr;
            }
        };
    }(width, height, margin, gutterBottom));

    /**
     * Mouse type events that are placed on the nodes/bubbles.
     */
    nodeEvents = (function () {
        // moves element (text) to the front of the screen (i.e. pants it last so it is visible)
        var moveToFront, mouseClickEvent, mouseOverEvent, mouseOutEvent;

        /**
         * Determines what to do it bubble is clicked
         */
        mouseClickEvent = (function () {
            var killNodeEvent, reviveNodeEvent;

            /**
             * This gets called after a user clicks a floating bubble.
             * @param obj {element} The float bubble/node that was killed/clacked.
             */
            killNodeEvent = function (obj) {
                var node = d3.select(obj)
                    .attr('class', 'nodes killed')
                    .each(function (d) {
                        d.killed = true;
                        d.r = 10;
                        d.gy = height - d.r - gutterBottom.margin.bottom;
                    });

                node.transition()
                    .duration(1000)
                    .attr('transform', function (d) {
                        return 'translate(' + d.gx + ',' + d.gy + ')';
                    });
                node.select('circle')
                    .style('fill', 'white')
                    .transition()
                    .delay(50)
                    .duration(100)
                    .attr('r', function (d) {
                        return d.r;
                    })
                    .style('fill', function (d) {
                        return d.color;
                    });
                node.select('text')
                    .style('font', function (d) {
                        return '300 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                    });

                force.alpha(0.03);

                (function () {
                    var aliveNodes, theTempExtent,
                        nodes = d3.selectAll('.nodes');

                    aliveNodes = nodes.select(function () {
                        return d3.select(this).attr('class') === 'nodes' ? this : null;
                    });

                    theTempExtent = d3.extent(aliveNodes.data(), function (obj) {
                        if (obj) {
                            return nodeUtils.getRadiusValue(obj.leftFreq, obj.rightFreq, obj.leftTotalFreq, obj.rightTotalFreq);
                        }
                    });

                    nodeUtils.getScaledRadius.domain(theTempExtent);
                    nodes.transition()
                        .duration(1000)
                        .each(function (d) {
                            // update the node's radius and y axis if it hasn't been killed
                            if (d3.select(this).attr('class') !== 'nodes killed') {
                                d.r = nodeUtils.getRadiusSize(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                            }
                        });

                    nodes.selectAll('circle')
                        .transition()
                        .duration(500)
                        .attr('r', function (d) {
                            return d.r;
                        })
                        .style('fill', function (d) {
                            return d.color;
                        });
                    nodes.selectAll('text')
                        .transition()
                        .duration(500)
                        .style('font', function (d) {
                            return '200 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                        });

                    force.alpha(0.03);
                }());
            };

            /**
             * Action after the user clicks a bubble that is in the gutter/killed.
             * @param obj (element) This is a node element with class 'nodes killed'
             */
            reviveNodeEvent = function (obj) {

                // Changes the
                d3.select(obj)
                    .attr('class', 'nodes')
                    .transition()
                    .duration(1000)
                    .each(function (d) {
                        //d.r = getRadiusSize(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                        d.gy = nodeUtils.getYPos(d.r);
                        d.color = nodeUtils.getColor(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                        d.killed = false;
                    });
                force.alpha(0.03);

                /**
                 * This sizes all other nodes because the revived node may be the new largest node.
                 */
                (function () {
                    var aliveNodes, theTempExtent,
                        nodes = d3.selectAll('.nodes');


                    aliveNodes = d3.selectAll('.nodes').select(function () {
                        return d3.select(this).attr('class') === 'nodes' ? this : null;
                    })
                        .data();
                    theTempExtent = d3.extent(aliveNodes, function (obj) {
                        if (obj) {
                            return nodeUtils.getRadiusValue(obj.leftFreq, obj.rightFreq, obj.leftTotalFreq, obj.rightTotalFreq);
                        }
                    });

                    nodeUtils.getScaledRadius.domain(theTempExtent);

                    nodes.transition()
                        .duration(1000)
                        .each(function (d) {
                            // update the node's radius and y axis if it hasn't been killed
                            if (d3.select(this).attr('class') !== 'nodes killed') {
                                d.r = nodeUtils.getRadiusSize(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                            }
                        });
                    nodes.selectAll('circle')
                        .transition()
                        .duration(500)
                        .attr('r', function (d) {
                            return d.r;
                        });
                    nodes.selectAll('text')
                        .transition()
                        .duration(500)
                        .style('font', function (d) {
                            return '200 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                        });

                    force.alpha(0.03);
                }());
            };

            return function () {
                if (d3.select(this).attr('class') === 'nodes killed') {
                    reviveNodeEvent(this);
                } else {
                    killNodeEvent(this);
                }
            };
        }());

        moveToFront = function (obj) {
            d3.select(obj).each(function () {
                obj.parentNode.appendChild(obj);
            });
        };

        mouseOverEvent = function () {
            var that = this,
                node = d3.select(this);
            moveToFront(this);
            d3.selectAll('.wordsLabels')
                .transition()
                .duration(25)
                .style('opacity', function (d) {
                    var targetX, targetY, xLen, yLen, hyp;
                    d3.select(that).each(function (d) {
                        targetX = d.gx;
                        targetY = d.gy;
                    });
                    xLen = d.gx - targetX;
                    yLen = d.gy - targetY;
                    hyp = Math.sqrt(xLen * xLen + yLen * yLen);
                    return nodeUtils.getOpacity(hyp);
                })
                .style('font', function (d) {
                    return '200 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                });
            node.select('circle')
                .attr('class', 'wordCirclesActive')
                .style('opacity', 0.9);
            node.select('text')
                .transition()
                .duration(50)
                .attr('class', 'wordsLabelsActive')
                .style('opacity', 1)
                .style('font', function (d) {
                    return '400 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                });
        };

        mouseOutEvent = function () {
            var nodes = d3.selectAll('.nodes');

            d3.selectAll('.wordsLabelsActive')
                .attr('class', 'wordsLabels')
                .style('fill', 'black');
            d3.selectAll('.wordCirclesActive')
                .classed('wordCirclesActive', false)
                .classed('wordCircles', true)
                .style('opacity', 0.7);
            d3.selectAll('.wordsLabels')
                .transition()
                .style('opacity', 0.7)
                .style('fill', 'black')
                .style('font', function (d) {
                    return '300 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                });

            // ensures all transitions are caught in the middle
            nodes.selectAll('circle')
                .transition()
                .duration(200)
                .attr('r', function (d) {
                    return d.r;
                })
                .style('fill', function (d) {
                    return d.color;
                });
            nodes.selectAll('text')
                .style('font', function (d) {
                    return '300 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                });
        };

        return {
            mouseOverEvent: mouseOverEvent,
            mouseOutEvent: mouseOutEvent,
            mouseClickEvent: mouseClickEvent
        };
    }());

    gravity = function (alpha) {
        return function (d) {
            d.y += (d.gy - d.y) * alpha;
            d.x += (d.gx - d.x) * alpha;
        };
    };

    collide = function (alpha) {
        var quadTree = d3.geom.quadtree(force.nodes());
        return function (d) {
            var r1 = d.r + nodeUtils.getScaledRadius.domain()[1] + padding,
                nx1 = d.x - r1,
                nx2 = d.x + r1,
                ny1 = d.y - r1,
                ny2 = d.y + r1;
            quadTree.visit(function (quad, x1, y1, x2, y2) {
                if (quad.point && (quad.point !== d)) {
                    var x = d.x - quad.point.x,
                        y = d.y - quad.point.y,
                        l = Math.sqrt(x * x + y * y),
                        r2 = d.r + quad.point.r + (d.color !== quad.point.color) * padding;
                    if (l < r2) {
                        l = (l - r2) / l * alpha;
                        x *= l;
                        y *= l;
                        d.x -= x;
                        d.y -= y;
                        quad.point.x += x;
                        quad.point.y += y;
                    }
                }
                return x1 > nx2
                    || x2 < nx1
                    || y1 > ny2
                    || y2 < ny1;
            });
        };
    };

    getTickY = function (d) {
        var value;
        if (d.killed) {
            value = Math.max(d.r, Math.min(height - d.r - gutterBottom.margin.bottom, d.y));
        } else {
            value = Math.max(d.r, Math.min(height - d.r - gutterBottom.total(), d.y));
        }
        return value;
    };

    tick = function (e) {
        var elements = d3.selectAll('.nodes')
            .each(gravity(0.9 * e.alpha))
            .each(collide(0.5));

        elements.transition()
            .duration(225)
            .attr('transform', function (d) {
                d.x = Math.max(d.r, Math.min(width - d.r, d.x));
                d.y = getTickY(d);
                return 'translate(' + d.x + ',' + d.y + ')';
            })
            .attr('r', function (d) {
                return d.r;
            });

        elements
            .on('mouseover', nodeEvents.mouseOverEvent)
            .on('mouseout', nodeEvents.mouseOutEvent)
            .on('click', nodeEvents.mouseClickEvent);

    };

    setTitle = function (side, titleText) {
        var header = document.createElement('header'),
            text = document.createTextNode(titleText),
            parent = document.querySelector(parentSelector);
        header.appendChild(text);
        if (side === 'leftSide') {
            header.id = 'title-text-left';
        } else {
            header.id = 'title-text-right';
        }
        parent.insertBefore(header, parent.firstElementChild);
    };

    redraw = function () {
        var nodes = d3.selectAll('.nodes');

        nodes.each(function (d) {
            if (d3.select(this).attr('class') !== 'nodes killed') {
                d.r = nodeUtils.getRadiusSize(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                d.gy = nodeUtils.getYPos(d.r);
            }

            d.gx = nodeUtils.getXPos(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
            d.color = nodeUtils.getColor(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
        });
        nodes.selectAll('circle')
            .transition()
            .duration(1000)
            .attr('r', function (d) {
                return d.r;
            })
            .style('fill', function (d) {
                return d.color;
            });
        nodes.selectAll('text')
            .transition()
            .duration(1000)
            .style('font', function (d) {
                return '200 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
            });

        //force.alpha(0.04);
        //force.alpha(0.07);
        force.alpha(0.2);

    };

    /**
     * This is a handy little function for jittering the bubbles in case they can't get to where the need to be. It essentially just redraws the bubbles after assigning them to a diff y coordinate.
     * @param numberOfIterations {int} Number of times to jitter.
     * @param msInterval {int} Number of ms inbetween each jitter.
     */
    jitter = function (numberOfIterations, msInterval) {
        var timesRun, interval;
        timesRun = 0;
        interval = window.setInterval(function () {
            if (timesRun < numberOfIterations) {
                redraw();
            } else {
                window.clearInterval(interval);
            }
            timesRun = timesRun + 1;
        }, msInterval);
    };

    /**
     * Updates one of the sides with new data.
     * @param side {string} Either 'leftSide' or 'rightSide'. Which side to update.
     * @param data {array} [{title: 'blah1', totalFrequency: 12345, keywords: [{text: 'someWord', frequency: 723}]},{title: 'blah2, ...}]
     */
    updateDisplay = function (side, data) {
        var newDataMap;

        if (side === 'leftSide') {
            document.getElementById('title-text-left').innerHTML = data.title;
        } else {
            document.getElementById('title-text-right').innerHTML = data.title;
        }

        newDataMap = d3.nest()
            .key(function (d) {
                return d.keyword;
            })
            .map(data.keywords, d3.map);

        d3.selectAll('.nodes')
            .each(function (d) {
                // update the tweet frequency based on the side
                if (side === 'leftSide') {

                    d.leftFreq = newDataMap.get(d.keyword)[0].frequency;
                    d.leftTotalFreq = data.totalFrequency;

                } else {
                    d.rightFreq = newDataMap.get(d.keyword)[0].frequency;
                    d.rightTotalFreq = data.totalFrequency;
                }
            })
            .call(function () {
                var aliveNodes, theCurrentExtent;

                aliveNodes = d3.selectAll('.nodes').select(function () {
                    return d3.select(this).attr('class') === 'nodes' ? this : null;
                })
                    .data();

                theCurrentExtent = d3.extent(aliveNodes, function (obj) {
                    if (obj) {
                        return nodeUtils.getRadiusValue(obj.leftFreq, obj.rightFreq, obj.leftTotalFreq, obj.rightTotalFreq);
                    }
                });

                nodeUtils.getScaledRadius.domain(theCurrentExtent);
            });

        redraw();

    };

    /**
     * Sets up everything.
     * @param data [Array] Must be a valid array with two objs. First will be on the right, and
     * second will be on the left. Format is:
     * [{title: 'blah1', totalFrequency: 12345, keywords: [{text: 'someWord', frequency: 723}]},{title: 'blah2, ...}]
     * Keywords must be identical in both lists.
     */
    initDisplay = function () {
        var getInitData,
            data = [dGen.getData(), dGen.getData()];


        svg = d3.select(parentSelector).append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        /**
         * Add change and shuffle buttons
         */
        (function () {
            var parent = document.querySelector(parentSelector),
                div = document.createElement('div'),
                leftButton = document.createElement('button'),
                lText = document.createTextNode('change'),
                rightButton = document.createElement('button'),
                rText = document.createTextNode('change'),
                middleDiv = document.createElement('div'),
                middleButton = document.createElement('button'),
                mText = document.createTextNode('shuffle'),
                clickTransition = function (element) {
                    element.style.color = '#551A8B';
                    element.style['border-bottom-color'] = '#551A8B';
                    d3.select(element).transition()
                        .delay(200)
                        .duration(2000)
                        .style('color', '#0000EE')
                        .style('border-bottom-color', '#0000EE');
                };
            div.id = 'link-button-div';

            leftButton.appendChild(lText);
            leftButton.className = 'link-button';
            leftButton.id = 'link-button-left';
            leftButton.addEventListener('click', function () {
                clickTransition(this);
                updateDisplay('leftSide', dGen.getData());
            });

            rightButton.appendChild(rText);
            rightButton.className = 'link-button';
            rightButton.id = 'link-button-right';
            rightButton.addEventListener('click', function () {
                clickTransition(this);
                updateDisplay('rightSide', dGen.getData());
            });

            middleButton.appendChild(mText);
            middleDiv.appendChild(middleButton);
            middleDiv.id = 'link-button-div-middle';
            middleButton.className = 'link-button';
            middleButton.addEventListener('click', function () {
                clickTransition(this);
                jitter(5, 250);
            });

            div.insertBefore(rightButton, div.firstElementChild);
            div.insertBefore(middleDiv, div.firstElementChild);
            div.insertBefore(leftButton, div.firstElementChild);
            parent.insertBefore(div, parent.firstElementChild);
        }());

        /**
         * Create background lines. I could have done this with plain svg, but I d3'd it up.
         */
        (function () {

            var lineFunction,
                backgroundPaths,
                leftLineData = [
                    {x: 0, y: height - gutterBottom.total()},
                    {x: 0, y: 0},
                    {x: 1, y: 0}
                ],
                rightLineData = [
                    {x: width, y: height - gutterBottom.total()},
                    {x: width, y: 0},
                    {x: width - 1, y: 0}
                ],
                topLeftLineData = [
                    {x: 1, y: 0},
                    {x: width / 2, y: 0}
                ],
                topRightLineData = [
                    {x: width / 2 - 1, y: 0},
                    {x: width, y: 0}
                ],
                middleLineDataB = [
                    {x: width / 2, y: height - gutterBottom.margin.bottom},
                    {x: width / 2, y: 0}
                ],
                gutterLineData = [
                    {x: 0, y: height - gutterBottom.total()},
                    {x: width, y: height - gutterBottom.total()}
                ],
                leftGutterCorner = [
                    {x: 0, y: height - gutterBottom.margin.bottom - 10},
                    {x: 0, y: height - gutterBottom.margin.bottom},
                    {x: 10, y: height - gutterBottom.margin.bottom}
                ],
                rightGutterCorner = [
                    {x: width, y: height - gutterBottom.margin.bottom - 10},
                    {x: width, y: height - gutterBottom.margin.bottom},
                    {x: width - 10, y: height - gutterBottom.margin.bottom}
                ],
                middleGutterLine = [
                    {x: (width / 2) - 10, y: height - gutterBottom.margin.bottom},
                    {x: (width / 2) + 10, y: height - gutterBottom.margin.bottom}
                ],
                leftMidGutterLine = [
                    {x: (width / 4) - 10, y: height - gutterBottom.margin.bottom},
                    {x: (width / 4) + 10, y: height - gutterBottom.margin.bottom}
                ],
                rightMidGutterLine = [
                    {x: 3 * (width / 4) - 10, y: height - gutterBottom.margin.bottom},
                    {x: 3 * (width / 4) + 10, y: height - gutterBottom.margin.bottom}
                ];

            lineFunction = d3.svg.line()
                .x(function (d) {
                    return d.x;
                })
                .y(function (d) {
                    return d.y;
                })
                .interpolate('linear');

            backgroundPaths = svg.append('g')
                .attr('class', 'backgroundPathGroup');

            // makes the gutter path
            backgroundPaths.append('path')
                .attr('d', function () {
                    return lineFunction(gutterLineData);
                })
                .style('stroke-opacity', '.5')
                .style('stroke-dasharray', '15,15')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(leftLineData))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(rightLineData))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(topLeftLineData))
                .style('stroke-opacity', 1)
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', '#000000');

            backgroundPaths.append('path')
                .attr('d', lineFunction(topRightLineData))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(middleLineDataB))
                .style('opacity', '.3')
                .style('stroke', 'black')
                .style('stroke-dasharray', '5,5')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(middleGutterLine))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');
            backgroundPaths.append('path')
                .attr('d', lineFunction(leftGutterCorner))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');
            backgroundPaths.append('path')
                .attr('d', lineFunction(rightGutterCorner))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');

            backgroundPaths.append('path')
                .attr('d', lineFunction(rightMidGutterLine))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');
            backgroundPaths.append('path')
                .attr('d', lineFunction(leftMidGutterLine))
                .style('stroke', 'black')
                .style('stroke-width', 2)
                .style('fill', 'none');

        }());

        getInitData = function () {
            var setNodesFreq, theCurrentExtent,
                newNodes = d3.map();

            // Formats the the raw data into the common data structure used by the plot.
            setNodesFreq = function (side, data, someMap) {
                var tempMap = someMap;
                if (side === 'leftSide') {
                    data.keywords.forEach(function (obj) {
                        var value = tempMap.get(obj.keyword);
                        value.keyword = obj.keyword;
                        value.leftFreq = obj.frequency;
                        value.leftTotalFreq = data.totalFrequency;
                        tempMap.set(obj.text, value);
                    });
                } else if (side === 'rightSide') {
                    data.keywords.forEach(function (obj) {
                        var value = tempMap.get(obj.keyword);
                        value.keyword = obj.keyword;
                        value.rightFreq = obj.frequency;
                        value.rightTotalFreq = data.totalFrequency;
                        tempMap.set(obj.text, value);
                    });
                }
                return tempMap;
            };

            data[0].keywords.forEach(function (obj) {
                newNodes.set(obj.keyword, {});
            });
            newNodes = setNodesFreq('leftSide', data[0], newNodes);
            newNodes = setNodesFreq('rightSide', data[1], newNodes);

            theCurrentExtent = d3.extent(newNodes.values(), function (obj) {
                return nodeUtils.getRadiusValue(obj.leftFreq, obj.rightFreq, obj.leftTotalFreq, obj.rightTotalFreq);
            });
            radiusExtents.setSideExtent('leftSide', theCurrentExtent);
            radiusExtents.setSideExtent('rightSide', theCurrentExtent);
            nodeUtils.getScaledRadius.domain(radiusExtents.getLargestExtent());

            return (function (someMap) {
                var processedNodes = d3.map();
                someMap.forEach(function (k, v) {
                    var value = v;
                    value.r = nodeUtils.getRadiusSize(value.leftFreq, value.rightFreq, value.leftTotalFreq, value.rightTotalFreq);
                    value.gx = nodeUtils.getXPos(value.leftFreq, value.rightFreq, value.leftTotalFreq, value.rightTotalFreq);
                    value.gy = nodeUtils.getYPos(value.r);
                    value.color = nodeUtils.getColor(value.leftFreq, value.rightFreq, value.leftTotalFreq, value.rightTotalFreq);
                    processedNodes.set(k, value);
                });
                return processedNodes;
            }(newNodes));
        };

        force = d3.layout.force()
            .nodes(getInitData().values())
            .size([width, height])
            .gravity(0)
            .on('tick', tick)
            .start();

        // Add all the data to the canvas
        (function () {
            // Create a 'g' element to hold the circle and label for each keyword
            var wordGroup = svg.selectAll('.nodes')
                .data(force.nodes(), function (d) {
                    return d.keyword;
                })
                .enter().append('g')
                .attr('class', 'nodes')
                .attr('transform', function (d) {
                    return 'translate(' + d.gx + ',' + d.gy + ')';
                })
                .call(force.drag);

            // Add circle to each group
            wordGroup.append('circle')
                .attr('class', 'wordCircles')
                .attr('id', function (d) {
                    return d.keyword;
                })
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', function (d) {
                    return d.r;
                })
                .style('opacity', '.7')
                .style('stroke', 'gray')
                .style('stroke-width', 1)
                .style('fill', function (d) {
                    return nodeUtils.getColor(d.leftFreq, d.rightFreq, d.leftTotalFreq, d.rightTotalFreq);
                });

            // Add the text label to each group
            wordGroup.append('text')
                .attr('class', 'wordsLabels')
                .attr('dx', 0) // not necessary, but I left this in
                .attr('dy', 0) // not necessary, but I left this in
                .attr('text-anchor', 'middle')
                .style('opacity', '.7')
                .style('pointer-events', 'none')
                .style('dominant-baseline', 'middle')
                .style('font', function (d) {
                    return '300 ' + nodeUtils.getFontSize(d.r) + 'px Helvetica Neue';
                })
                .text(function (d) {
                    return d.keyword;
                });
        }());

        setTitle('leftSide', data[0].title);
        setTitle('rightSide', data[1].title);
    };

    return {
        initDisplay: initDisplay,
        // not used, but I left this in for easy wiring for future use
        updateDisplay: updateDisplay
    };

};