# QuantGuide Question

## 408. Rainbow Selection

**Metadata**

- ID: `il5ySBlh4Mu9NNfsJJhy`
- URL: https://www.quantguide.io/questions/rainbow-selection
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: N/A
- Source: TQD, adapted
- Tags: Conditional Probability
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-16 14:34:19 America/New_York
- Last Edited By: Gabe

### 题干

An urn contains $20$ balls colored each of the $7$ colors of the rainbow ($140$ total balls). We select balls one-by-one without replacement. Given that in the first $70$ draws we selected $5$ more red balls than yellow, find the probability the $71$st ball drawn is yellow. 

### Hint

Having the $5$ more red balls drawn than yellow does not affect our expectation on the number of balls drawn for any of the other colors in the first $70$ draws. You can see this by considering a combined "red and yellow" color. Then, in this case, we would expect each of the other $5$ colors to be drawn with probability $\dfrac{1}{7}$ on the next draw, as the drawing process is exchangeable. 

### 解答

Having the $5$ more red balls drawn than yellow does not affect our expectation on the number of balls drawn for any of the other colors in the first $70$ draws. You can see this by considering a combined "red and yellow" color. Then, in this case, we would expect each of the other $5$ colors to be drawn with probability $\dfrac{1}{7}$ on the next draw, as the drawing process is exchangeable. 

$$$$

Now, if $r$ and $y$ represent the probabilities of a red and yellow ball, respectively, on the next draw, then we know that $r+y = \dfrac{2}{7}$, as that is the remaining probability left after giving the other $5$ colors $\dfrac{1}{7}$ probability each. However, note that we selected $5$ more red balls than yellow in the first $70$ draws. Therefore, there are $5$ fewer red balls left in the urn than yellow. This implies that $r = y - \dfrac{5}{70} = y - \dfrac{1}{14}$, as there are $70$ balls left and $5$ fewer of them are red as opposed to yellow. 

$$$$

Therefore, we get $2y - \dfrac{1}{14} = \dfrac{2}{7}$, so $y = \dfrac{5}{28}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "5/28"
    ],
    "companies": [],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "il5ySBlh4Mu9NNfsJJhy",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-16 14:34:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 3202228,
    "source": "TQD, adapted",
    "status": "published",
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Rainbow Selection",
    "topic": "probability",
    "urlEnding": "rainbow-selection",
    "version": 1
  },
  "list_summary": {
    "companies": [],
    "difficulty": "medium",
    "id": "il5ySBlh4Mu9NNfsJJhy",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Conditional Probability"
      }
    ],
    "title": "Rainbow Selection",
    "topic": "probability",
    "urlEnding": "rainbow-selection"
  }
}
```
