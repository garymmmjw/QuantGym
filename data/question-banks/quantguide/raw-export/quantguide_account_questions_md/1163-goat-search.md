# QuantGuide Question

## 1163. Goat Search

**Metadata**

- ID: `9iOEWEi1nn86rsfA3sYB`
- URL: https://www.quantguide.io/questions/goat-search
- Topic: probability
- Difficulty: easy
- Internal Difficulty: N/A
- Companies: N/A
- Source: N/A
- Tags: Expected Value
- Premium: True
- Solution Free: False
- Version: N/A
- Last Edited: N/A
- Last Edited By: N/A

### 题干

A farmer wants one male and one female goat for breeding. He goes to Mount Everest to find goats. Each goat is known to be male with probability $\dfrac{3}{4}$, independent of all other goats. The farmer takes a goat, examines it, and then leaves with the first two goats that are of opposite genders. If $N$ is the total number of goats that the farmer examines until he observes two goats of opposite genders, find $\mathbb{E}[N]$.

### Hint

Condition on the gender of the first goat selected.

### 解答

Let $M$ and $F$ represent the events that the first goats viewed are male and female, respectively. By Law of Total Expectation, $$\mathbb{E}[N] = \mathbb{E}[N \mid M]\mathbb{P}[M] + \mathbb{E}[N \mid F]\mathbb{P}[F]$$ We know $\mathbb{P}[M] = \dfrac{3}{4}$, so $\mathbb{P}[F] = \dfrac{1}{4}$. Then, given the first goat selected is male, with probability $\dfrac{1}{4}$ on each trial after we get a female goat and then we leave. Therefore, the distribution of the number of trials needed to see the first female goat after the male is selected is $\text{Geom}\left(\dfrac{1}{4}\right)$, which has mean $4$. Therefore, $\mathbb{E}[N \mid M] = 1 + 4 = 5$. We add the one in for the first goat (male) that is selected.

$$$$

Similarly, if the first goat is female, the distribution of the number of goats needed to be selected until getting a male goat is $\text{Geom}\left(\dfrac{3}{4}\right)$, which has mean $\dfrac{4}{3}$. Therefore, $\mathbb{E}[N \mid F] = 1 + \dfrac{4}{3} = \dfrac{7}{3}$. Putting it all together, $\mathbb{E}[N] = 5 \cdot \dfrac{3}{4} + \dfrac{7}{3} \cdot \dfrac{1}{4} = \dfrac{13}{3}$.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "13/3"
    ],
    "difficulty": "easy",
    "id": "9iOEWEi1nn86rsfA3sYB",
    "internalDifficulty": 0,
    "isPremium": true,
    "isPublished": true,
    "isSolutionFree": false,
    "orderId": 9665130,
    "source": "",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Goat Search",
    "topic": "probability",
    "urlEnding": "goat-search"
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "easy",
    "id": "9iOEWEi1nn86rsfA3sYB",
    "isAIType": "$undefined",
    "isPremium": true,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Goat Search",
    "topic": "probability",
    "urlEnding": "goat-search"
  }
}
```
