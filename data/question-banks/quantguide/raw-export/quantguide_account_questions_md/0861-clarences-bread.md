# QuantGuide Question

## 861. Clarence's Bread

**Metadata**

- ID: `Cw1RF0lom2iANot7fnZv`
- URL: https://www.quantguide.io/questions/clarences-bread
- Topic: probability
- Difficulty: hard
- Internal Difficulty: 4
- Companies: Old Mission
- Source: OMC Interview Question
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: N/A
- Last Edited: 2023-8-25 23:50:02 America/New_York
- Last Edited By: Gabe

### 题干

Clarence is getting this bread. Literally. Clarence has 7 small loaves and 3 large loaves of bread in a bag. He draws in his bag and pulls out a loaf of bread uniformly at random, one-by-one. If it is a small loaf, Clarence eats it. If it is a large loaf, Clarence cuts it into two small loaves. He eats one one of them and puts the other one back in the bag. Find the expected number of small loaves that Clarence eats until the bag contains only small loaves left, inclusive of the small loaf he eats as a result of the last large loaf he draws.

### Hint

Use the "First Ace" approach three separate times on the first appearances of the next large loaf after previous ones have been eaten.

### 解答

Here, we are looking for the expected number of draws needed until Clarence grabs all $3$ large loaves of bread from the bag. Since we are doing this drawing without replacement, this implies we should implement some type of "First Ace" approach. However, the issue here is that when Clarence draws a large loaf, he replaces it by another small loaf. Therefore, this isn't exactly like the paradigm above, as when you draw an Ace, it is not replaced in any way. Our new strategy is to thus consider the expected number of draws needed to see each consecutive large loaf.

$$$$

First, let's find the number of loaves Clarence eats until (and including) his first selection of a large loaf. There are $3$ large loaves and $7$ small loaves. Therefore, we can treat the large loaves as our "dividers" and the $7$ small as filler between them. The loaves split up our drawing process into $4$ equally-sized components (in expectation). 

$$$$

Therefore, we expect $\dfrac{7}{4}$ small loaves before the first large loaf. Afterwards, Clarence eats one of the two small loaves that results from the large loaf and then replaces the other in the bag. Therefore, he has eaten a total of $\dfrac{7}{4} + 1 = \dfrac{11}{4}$ loaves thus far. Additionally, there are $\dfrac{7}{4} - 1 = \dfrac{3}{4}$ fewer small loaves in the bag on average. 

$$$$

Now, we apply the same paradigm again but on $7 - \dfrac{3}{4} = \dfrac{25}{4}$ small loaves and $2$ large loaves. We get $3$ equally-sized regions in expectation from the two large loaves, so there should be $\dfrac{25}{12}$ small loaves coming before the next large loaf. Therefore, Clarence eats $\dfrac{25}{12} + 1 = \dfrac{37}{12}$ small loaves on average between the first and second large loaf selection. This brings our total thus far to $\dfrac{11}{4} + \dfrac{37}{12} = \dfrac{35}{6}$.

$$$$

With one large loaf left and an (on average) $\dfrac{25}{4} - \dfrac{13}{12} = \dfrac{31}{6}$ small loaves left, we would expect half of those small loaves to come before the large loaf. Therefore, we expect Clarence to eat $\dfrac{31}{12} + 1 = \dfrac{43}{12}$ more large loaves until completion. 

$$$$

This yields that Clarence would need to eat an expected number of $\dfrac{35}{6} + \dfrac{43}{12} = \dfrac{113}{12}$ small loaves total. 

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "113/12"
    ],
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "hard",
    "hasEdits": false,
    "id": "Cw1RF0lom2iANot7fnZv",
    "internalDifficulty": 4,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-8-25 23:50:02 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 7039041,
    "source": "OMC Interview Question",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Clarence's Bread",
    "topic": "probability",
    "urlEnding": "clarences-bread"
  },
  "list_summary": {
    "companies": [
      {
        "company": "Old Mission"
      }
    ],
    "difficulty": "hard",
    "id": "Cw1RF0lom2iANot7fnZv",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Clarence's Bread",
    "topic": "probability",
    "urlEnding": "clarences-bread"
  }
}
```
