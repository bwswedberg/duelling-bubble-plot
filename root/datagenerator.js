/**
 * Simple class that will produce random data for the duelling bubble plot.
 * On function call it will produce a closure that will return the same fruit and
 * veggies each time. On each getData(), it will try to return a unique state, but
 * once it gets through all the states it will reset. Fruit and veggie numbers are
 * random based in input parameters.
 * @param numKeywords {int} Number of keywords(bubbles).
 * @param frequencyRange {int} A range for assigning random values to each keyword. 0 to whatever.
 * @returns {title:'someStateName', totalFrequency: intTotalAmtOfFruitVeg, keywords:[{keyword: 'someFruitVeg', frequency: intRandomFreq}, {}, ...]}
 */
var dataGenerator = function (numKeywords, frequencyRange) {
    var pickedStates = [],
        fruitAndVeggies = d3.shuffle([
            'potato', 'corn', 'green bean', 'apple', 'carrot',
            'watermelon', 'cantaloupe', 'onion', 'grapes', 'tomato',
            'radish', 'celery', 'cabbage', 'pea', 'eggplant',
            'plum', 'peach', 'pear', 'banana', 'cucumber',
            'squash', 'red pepper', 'coconut', 'pumpkin', 'pickle',
            'asparagus', 'lettuce', 'spinach', 'pomegranate', 'nectarine',
            'beets', 'broccoli', 'olive', 'orange', 'passion fruit',
            'grapefruit', 'jalapeno', 'date', 'apricot', 'avacado',
            'cherry', 'raspberry', 'blueberry', 'kiwi', 'lemon',
            'mango', 'pineapple', 'rhubarb', 'strawberry', 'yam',
            'zucchini', 'leek', 'artichoke', 'bean sprout', 'cauliflower',
            'fig', 'kale', 'lima bean', 'papayas', 'plantain',
            'shallot', 'sweet potato', 'green pepper', 'chili', 'blackberry',
            'kidney bean'
        ]).slice(0, numKeywords),
        states = d3.shuffle([
            'Washington', 'Oregon', 'California', 'Nevada', 'Colorado',
            'Wyoming', 'Montana', 'Idaho', 'New Mexico', 'Arizona',
            'Texas', 'Utah', 'North Dakota', 'South Dakota', 'Nebraska',
            'Kansas', 'Minnesota', 'Iowa', 'Missouri', 'Mississippi',
            'Louisiana', 'Alabama', 'Illinois', 'Wisconsin', 'Georgia',
            'Florida', 'Kentucky', 'Tennessee', 'North Carolina', 'West Virgina',
            'Virgina', 'South Carolina', 'Pennsylvania', 'New York', 'Maryland',
            'Delaware', 'Connecticut', 'Massachusetts', 'Vermont', 'New Hampshire',
            'Maine', 'Rhode Island', 'Alaska', 'Hawaii', 'Indiana',
            'Ohio', 'Michigan', 'Oklahoma', 'Arkansas', 'New Jersey',
            'District of Columbia'
        ]);

    return {
        getData: function () {
            var keywordObjArray = [],
                totalFreq = 0,
                someTitle = states.splice(0, 1)[0];

            if (states.length === 0) {
                states = pickedStates;
                pickedStates = [];
            }

            fruitAndVeggies.forEach(function (d) {
                var freq = Math.floor(Math.random() * frequencyRange);
                keywordObjArray.push({keyword: d, frequency: freq});
                totalFreq = totalFreq + freq;
            });

            return {
                title: someTitle,
                keywords: keywordObjArray,
                totalFrequency: totalFreq
            };
        }
    };
};
