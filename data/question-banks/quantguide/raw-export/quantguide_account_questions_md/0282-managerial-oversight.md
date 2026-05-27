# QuantGuide Question

## 282. Thank You, Quant!

**Metadata**

- ID: `EonYOVAhVl0GlOxCMur2`
- URL: https://www.quantguide.io/questions/managerial-oversight
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 2
- Companies: Citadel, GSA Capital
- Source: Citadel OA
- Tags: Continuous Random Variables
- Premium: False
- Solution Free: False
- Version: 2
- Last Edited: 2023-10-17 08:07:34 America/New_York
- Last Edited By: Gabe

### 题干

Two quant firms have client inflow that is well-modeled by independent Poisson processes. The respective intensity parameters are $6$ and $10$. Clients give outstanding reviews about the service with respective probabilities $\dfrac{1}{6}$ and $\dfrac{1}{5}$ for the two firms, independent of one another. The clients that give outstanding reviews are sent a thank you card. Find the expected time between clients that receive thank you cards.

### Hint

Use Poisson thinning to note that the inflow of clients sent thank you cards from either firm is also a Poisson process. What are the parameters for each? How can you relate that to the rate of clients being sent thank you cards?

### 解答

We first use Poisson thinning to note that the inflow of clients sent a thank you card from each firm is also a Poisson process. For the two respective firms, the rates are $6 \cdot \dfrac{1}{6} = 1$ and $10 \cdot \dfrac{1}{5} = 2$. Therefore, the time between clients being sent thank you cards for each firm follow IID $\text{Exp}(1)$ and $\text{Exp}(2)$ distributions, respectively. The time between any clients being sent thank you cards is $\text{min}\{X_1,X_2\}$, where $X_i \sim \text{Exp}(i)$, as whichever firm has a shorter interarrival time of clients being sent thank you cards will represent the time between clients (from either firm) being sent cards. 

$$$$

Then, we can note that for any $t > 0$, from the known facts about the exponential random variable, $$\mathbb{P}[\text{min}\{X_1,X_2\} > t] = \mathbb{P}[X_1 > t]\mathbb{P}[X_2 > t] = e^{-t} \cdot e^{-2t} = e^{-3t}$$ Therefore, we have that $\text{min}\{X_1,X_2\} \sim \text{Exp}(3)$. In particular, this means the mean of this is $\dfrac{1}{3}$, which is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "1/3"
    ],
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "EonYOVAhVl0GlOxCMur2",
    "internalDifficulty": 2,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-10-17 08:07:34 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2182710,
    "source": "Citadel OA",
    "status": "published",
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Thank You, Quant!",
    "topic": "probability",
    "urlEnding": "managerial-oversight",
    "version": 2
  },
  "list_summary": {
    "companies": [
      {
        "company": "Citadel"
      },
      {
        "company": "GSA Capital"
      }
    ],
    "difficulty": "medium",
    "id": "EonYOVAhVl0GlOxCMur2",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Continuous Random Variables"
      }
    ],
    "title": "Thank You, Quant!",
    "topic": "probability",
    "urlEnding": "managerial-oversight"
  }
}
```
