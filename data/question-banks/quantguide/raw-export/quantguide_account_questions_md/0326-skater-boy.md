# QuantGuide Question

## 326. Skater Boy

**Metadata**

- ID: `5BnWuFnTVBkPr0AypLxW`
- URL: https://www.quantguide.io/questions/skater-boy
- Topic: probability
- Difficulty: medium
- Internal Difficulty: 3
- Companies: N/A
- Source: cambridge
- Tags: Expected Value
- Premium: False
- Solution Free: False
- Version: 1
- Last Edited: 2023-9-19 21:02:27 America/New_York
- Last Edited By: Gabe

### 题干

Michael is taking his remote control skateboard around campus. Assume the front of the Hopkins sign is the origin $(0,0)$, and that movement to the right is positive horizontally, and movement into campus (upwards) is positive vertically. Each second, Michael chooses a uniformly random angle between $0$ and $2\pi$, and then moves his skateboard a distance of 1 foot at that angle from the skateboards previous position. After $16$ seconds, what is the expected squared distance Michael's skateboard is away from the Hopkins sign?

### Hint

Define a distance variable and write it as the sum of $16$ IID random variables.

### 解答

We know that we select an angle uniformly at random and then we move $1$ unit in that direction. Thus, we have that after $n$ movements, if $\theta_1,\dots, \theta_n$ are the angles selected, $X = \displaystyle \sum_{i=1}^n \cos(\theta_i)$ and $Y = \displaystyle \sum_{i=1}^n \sin(\theta_i)$, where each of the $\theta_i$ are IID Unif$(0,2\pi)$ random variables. Thus, the expected squared distance from the origin is just $$D^2 = X^2 + Y^2 = \displaystyle \left(\sum_{i=1}^n \cos(\theta_i)\right)^2 + \left(\sum_{i=1}^n \sin(\theta_i)\right)^2 $$ Next, we can expand out each of the summations to get that the above is $\displaystyle \sum_{i=1}^n \cos^2(\theta_i) + \sum_{i\ \neq j} \cos(\theta_i)\cos(\theta_j) + \displaystyle \sum_{i=1}^n \sin^2(\theta_i) + \sum_{i \neq j} \sin(\theta_i)\sin(\theta_j).$ Grouping the terms together nicely, we get that the above is $$\displaystyle \sum_{i=1}^n \left(\cos^2(\theta_i) + \sin^2(\theta_i)\right) + \displaystyle \sum_{i \neq j} \left(\cos(\theta_i)\cos(\theta_j) + \sin(\theta_i)\sin(\theta_j)\right)$$ The first sum evaluates to just $n$ by trigonometric identities. The second has an interior equal to $\cos(\theta_i - \theta_j)$. Thus, we have that $D^2 = n + \displaystyle \sum_{i \neq j} \cos(\theta_i - \theta_j)$. Therefore, the expectation $\mathbb{E}[D^2] = n + \displaystyle \sum_{i\neq j} \mathbb{E}[\cos(\theta_i - \theta_j)]$. Computing this expectation is quite simple. The joint PDF of $\theta_i$ and $\theta_j$ is given by $f(\theta_i,\theta_j) = \dfrac{1}{4\pi^2}I_{(0,2\pi)}(\theta_i)I_{(0,2\pi)}(\theta_j)$, so this expectation is given by $\displaystyle \int_0^{2\pi} \int_0^{2\pi} \dfrac{\cos(\theta_i - \theta_j)}{4\pi^2}d\theta_id\theta_j$. The first integral evaluates to $\displaystyle \int_0^{2\pi} -\dfrac{1}{4\pi^2}\left(\sin(2\pi-\theta_j) - \sin(-\theta_j)\right)d\theta_j = 0$, as $\sin(-\theta_j) = \sin(2\pi - \theta_j)$ by periodicity. Thus, the expectation is just $n$. Alternatively, you could see that since $\theta$ ranges over $(0,2\pi)$, the mean of the cosine and sine on those intervals is $0$, so that can go quicker.

$$$$

Our specific case here is $n = 16$, so $16$ is our answer.

### QuantGuide 原始元数据（不含题干/Hint/解答正文）

```json
{
  "detail": {
    "answers": [
      "16"
    ],
    "difficulty": "medium",
    "hasEdits": false,
    "id": "5BnWuFnTVBkPr0AypLxW",
    "internalDifficulty": 3,
    "isPremium": false,
    "isPublished": true,
    "isSolutionFree": false,
    "lastEditedAt": "2023-9-19 21:02:27 America/New_York",
    "lastEditedBy": "Gabe",
    "orderId": 2515230,
    "randomizable": "",
    "source": "cambridge",
    "status": "published",
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Skater Boy",
    "topic": "probability",
    "urlEnding": "skater-boy",
    "version": 1
  },
  "list_summary": {
    "companies": "$undefined",
    "difficulty": "medium",
    "id": "5BnWuFnTVBkPr0AypLxW",
    "isAIType": "$undefined",
    "isPremium": false,
    "tags": [
      {
        "tag": "Expected Value"
      }
    ],
    "title": "Skater Boy",
    "topic": "probability",
    "urlEnding": "skater-boy"
  }
}
```
