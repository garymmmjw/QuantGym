# QuantGuide Question

## 1175. Colorful Socks III

**Metadata**

- ID: `7noak5bOrEGOX9M3UFEL`
- URL: https://www.quantguide.io/questions/colorful-socks-iii
- Topic: probability
- Difficulty: easy
- Internal Difficulty: 1
- Companies: N/A
- Source: Original
- Tags: Events
- Premium: True
- Solution Free: False
- Version: 1
- Last Edited: 2023-11-8 10:12:19 America/New_York
- Last Edited By: Gabe

### 题干

$$21$ socks are in a drawer. There are $10$ colors of socks in the drawer. $9$ of the colors just have a pair of socks of that color. The remaining color has 3 socks of that color in the drawer. You draw out 2 socks at random. Find the probability that you obtain a matching pair.

### Hint

Condition on whether or not the matching pair is the color that has $3$ replicates.

### 解答

There are two cases to consider when getting a matching pair: We need to consider whether or not the color that matches is the color that has 3 replicates. This is because the probability that we draw another sock of that same color is different dependent on how many socks of that color are left. The probability that we select a sock on the first draw that just has a pair is $\dfrac{18}{21} = \dfrac{6}{7}$. Then, the probability that on the second draw we select a sock of that same color is $\dfrac{1}{20}$, as we assume this is a color with just the pair. This case yields a net probability of $\dfrac{6}{7} \cdot \dfrac{1}{20} = \dfrac{6}{140}$.

$$$$

The other case is that we select the color with 3 socks, which occurs with probability $\dfrac{1}{7}$ on the first draw. The probability we draw another sock of that color is $\dfrac{2}{20}$, as 2 of the 20 remaining socks are of that color. This case yields a net probability of $\dfrac{1}{7} \cdot \dfrac{2}{20} = \dfrac{2}{140}$. Adding up the cases, our total probability of drawing a pair is $\dfrac{8}{140} = \dfrac{2}{35}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "2/35"
    ],
    "difficulty": "easy",
    "hasEdits": false,
    "id": "7noak5bOrEGOX9M3UFEL",
    "internalDifficulty": 1,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-11-8 10:12:19 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 9768736,
    "source": "Original",
    "status": "published",
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Colorful Socks III",
    "topic": "probability",
    "urlEnding": "colorful-socks-iii",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "7noak5bOrEGOX9M3UFEL",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Events"
      }
    ],
    "title": "Colorful Socks III",
    "topic": "probability",
    "urlEnding": "colorful-socks-iii"
  }
}
```
